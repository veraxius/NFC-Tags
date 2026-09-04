import { createHmac, randomBytes } from "crypto";

// Time-based one-time passwords (RFC 6238) built on Node's own `crypto` —
// no otplib/speakeasy dependency, same house rule as the rest of the app
// (no third-party libraries where a well-specified algorithm this small
// can just be implemented directly).

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const CODE_DIGITS = 6;

function base32Encode(buffer: Buffer): string {
  let bits = "";
  for (const byte of buffer) bits += byte.toString(2).padStart(8, "0");
  let output = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    output += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  const remainder = bits.length % 5;
  if (remainder > 0) {
    const lastChunk = bits.slice(bits.length - remainder).padEnd(5, "0");
    output += BASE32_ALPHABET[parseInt(lastChunk, 2)];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

// A fresh, random enrollment secret — shown to the user as both the
// otpauth:// URI (for scanning) and the raw base32 string (for manual entry
// into any authenticator app; no QR image renderer added just for this).
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20)); // 160 bits, the RFC 6238 default
}

export function totpAuthUrl(params: { secret: string; accountLabel: string; issuer?: string }): string {
  const issuer = params.issuer ?? "JourneyPort";
  const label = encodeURIComponent(`${issuer}:${params.accountLabel}`);
  return `otpauth://totp/${label}?secret=${params.secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${CODE_DIGITS}&period=${STEP_SECONDS}`;
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac("sha1", key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 10 ** CODE_DIGITS).padStart(CODE_DIGITS, "0");
}

// Accepts the current 30s window plus one step of drift on either side, so
// a slightly slow phone clock doesn't lock someone out.
export function verifyTotp(secret: string, token: string, driftSteps = 1): boolean {
  const cleanToken = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(cleanToken)) return false;
  const counter = Math.floor(Date.now() / 1000 / STEP_SECONDS);
  for (let drift = -driftSteps; drift <= driftSteps; drift++) {
    const window = counter + drift;
    if (window < 0) continue; // no valid counter this close to the Unix epoch
    if (hotp(secret, window) === cleanToken) return true;
  }
  return false;
}

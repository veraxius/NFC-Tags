import crypto from "crypto";

// Unambiguous alphabet (no 0/O, 1/I/L) for human-facing public IDs
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomCode(length: number): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

// TRS 8: public identifier must not expose the database UUID, e.g. JP-US-K7M9Q2X4
export const journeyPublicId = (country = "US") => `JP-${country}-${randomCode(8)}`;
export const devicePublicId = () => `JPD-${randomCode(6)}`;
export const partnerPublicId = () => `PTR-${randomCode(6)}`;
export const earthyDoingPublicId = () =>
  `ED-${new Date().getFullYear()}-${randomCode(6)}`;
export const participationPublicId = () => `PART-${randomCode(8)}`;
export const milestonePublicId = () => `JM-${randomCode(8)}`;
export const aimRequestId = () => `JP-AIM-${randomCode(10)}`;
export const requestId = () => `req_${crypto.randomBytes(8).toString("hex")}`;

// TRS 23: NFC token — non-sequential, high entropy, revocable, mapped server-side.
// The DB stores only the SHA-256 hash of the token.
export function generateNfcToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(24).toString("base64url");
  return { token, tokenHash: hashNfcToken(token) };
}

export function hashNfcToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const programPublicId = () => `PRG-${randomCode(6)}`;
export const disputePublicId = () => `DSP-${randomCode(6)}`;
export const verificationPolicyPublicId = () => `VPOL-${randomCode(6)}`;
export const donationPublicId = () => `DON-${randomCode(6)}`;
export const expensePublicId = () => `EXP-${randomCode(6)}`;

// Single-use tokens for password reset / email verification (TRS 27).
// Same rule as NFC tokens: only the hash is ever stored.
export function generateOpaqueToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, tokenHash: hashOpaqueToken(token) };
}

export function hashOpaqueToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

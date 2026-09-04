import { describe, it, expect, vi, afterEach } from "vitest";
import { generateTotpSecret, totpAuthUrl, verifyTotp } from "@/lib/totp";

// RFC 6238 Appendix B test vector: ASCII secret "12345678901234567890",
// base32-encoded below, at Unix time 59s (counter = floor(59/30) = 1).
// The RFC's own 8-digit SHA1 code at that counter is "94287082" — since
// truncation to N digits is just `binary % 10**N` on the same underlying
// value, the correct 6-digit code is its last 6 digits: "287082". This
// confirms the hand-rolled HMAC-SHA1/HOTP math is actually RFC-correct,
// not just internally self-consistent.
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

afterEach(() => {
  vi.useRealTimers();
});

describe("verifyTotp", () => {
  it("matches the RFC 6238 test vector at t=59s", () => {
    vi.useFakeTimers();
    vi.setSystemTime(59 * 1000);
    expect(verifyTotp(RFC_SECRET, "287082")).toBe(true);
  });

  it("rejects an incorrect code", () => {
    vi.useFakeTimers();
    vi.setSystemTime(59 * 1000);
    expect(verifyTotp(RFC_SECRET, "000000")).toBe(false);
  });

  it("tolerates one step of clock drift", () => {
    // Counter for t=59s is 1; one step later (t=89s, counter=2) the same
    // code from counter 1 should still be accepted within the drift window.
    vi.useFakeTimers();
    vi.setSystemTime(89 * 1000);
    expect(verifyTotp(RFC_SECRET, "287082")).toBe(true);
  });

  it("rejects a code two steps away from the current window", () => {
    vi.useFakeTimers();
    vi.setSystemTime((59 + 30 * 2) * 1000);
    expect(verifyTotp(RFC_SECRET, "287082")).toBe(false);
  });

  it("rejects malformed input instead of throwing", () => {
    expect(verifyTotp(RFC_SECRET, "not-a-code")).toBe(false);
    expect(verifyTotp(RFC_SECRET, "12345")).toBe(false);
  });
});

describe("generateTotpSecret / totpAuthUrl", () => {
  it("generates a well-formed base32 secret that verifyTotp can consume without throwing", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    // The RFC vector test above already proves the HOTP/TOTP math itself is
    // correct; this just confirms a freshly generated secret is safe to
    // feed into verifyTotp under normal (real, current-time) conditions.
    expect(() => verifyTotp(secret, "123456")).not.toThrow();
  });

  it("never lets a near-epoch clock produce a negative HOTP counter", () => {
    // Regression test: verifyTotp used to crash (RangeError from
    // BigInt.writeUInt64BE) when Date.now() was close enough to zero that
    // counter - driftSteps went negative. Real deployments never run at
    // t≈0, but the guard should hold regardless.
    vi.useFakeTimers();
    vi.setSystemTime(0);
    expect(() => verifyTotp(RFC_SECRET, "123456")).not.toThrow();
  });

  it("builds a valid otpauth:// URL", () => {
    const url = totpAuthUrl({ secret: "ABCDEFGH", accountLabel: "admin@example.com" });
    expect(url).toContain("otpauth://totp/");
    expect(url).toContain("secret=ABCDEFGH");
    expect(url).toContain("issuer=JourneyPort");
  });
});

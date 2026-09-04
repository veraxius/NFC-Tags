import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { verifyMfaChallenge, createSession } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";
import { audit } from "@/lib/audit";
import { rateLimit, clientIp } from "@/lib/rateLimit";

const schema = z.object({ mfaToken: z.string(), code: z.string().min(6).max(6) });

// Step 2 of a 2FA login: exchange the short-lived challenge from
// /auth/login plus a valid TOTP code for a real session.
export const POST = handler(async (req: Request) => {
  const ip = clientIp(req);
  const { allowed } = rateLimit(`verify-2fa:${ip}`, 10, 15 * 60 * 1000);
  if (!allowed) {
    return fail("RATE_LIMITED", "Too many attempts. Try again in a few minutes.", 429);
  }

  const { mfaToken, code } = schema.parse(await req.json());
  const userId = await verifyMfaChallenge(mfaToken);
  if (!userId) {
    return fail("CHALLENGE_EXPIRED", "This login attempt expired. Sign in again.", 401);
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret || user.status !== "active") {
    return fail("INVALID_CODE", "That code didn't match.", 401);
  }
  if (!verifyTotp(user.twoFactorSecret, code)) {
    await audit({
      actorType: "system",
      action: "auth.2fa_failed",
      objectType: "user",
      objectId: user.id,
    });
    return fail("INVALID_CODE", "That code didn't match.", 401);
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  await audit({
    actorType: "member",
    actorId: user.id,
    action: "auth.login",
    objectType: "user",
    objectId: user.id,
    reason: "2fa_verified",
  });

  return ok({ id: user.id });
});

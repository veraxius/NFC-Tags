import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { verifyPassword, createSession, createMfaChallenge } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { rateLimit, clientIp } from "@/lib/rateLimit";

const schema = z.object({ email: z.string().email(), password: z.string() });

export const POST = handler(async (req: Request) => {
  const body = schema.parse(await req.json());
  const ip = clientIp(req);

  // Two buckets: one per IP+email (stops guessing one account) and one
  // broader per IP (stops spraying many emails from the same source).
  const perAccount = rateLimit(`login:${ip}:${body.email.toLowerCase()}`, 5, 15 * 60 * 1000);
  const perIp = rateLimit(`login:${ip}`, 20, 15 * 60 * 1000);
  if (!perAccount.allowed || !perIp.allowed) {
    return fail("RATE_LIMITED", "Too many login attempts. Try again in a few minutes.", 429);
  }

  const user = await db.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (!user || !user.passwordHash || !(await verifyPassword(body.password, user.passwordHash))) {
    await audit({
      actorType: "system",
      action: "auth.login_failed",
      objectType: "user",
      objectId: user?.id ?? "unknown",
      reason: "invalid_credentials",
    });
    return fail("INVALID_CREDENTIALS", "Invalid email or password.", 401);
  }
  if (user.status !== "active") {
    return fail("ACCOUNT_INACTIVE", "This account is not active.", 403);
  }

  if (user.twoFactorEnabled) {
    // Password checked out, but no session yet — the client must complete
    // the challenge at /auth/verify-2fa before createSession() ever runs.
    const mfaToken = await createMfaChallenge(user.id);
    return ok({ requiresTwoFactor: true, mfaToken });
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  await audit({
    actorType: "member",
    actorId: user.id,
    action: "auth.login",
    objectType: "user",
    objectId: user.id,
  });
  return ok({ id: user.id });
});

import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { verifyPassword, createSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

const schema = z.object({ email: z.string().email(), password: z.string() });

export const POST = handler(async (req: Request) => {
  const body = schema.parse(await req.json());
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

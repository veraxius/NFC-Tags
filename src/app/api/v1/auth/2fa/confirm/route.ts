import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser, isAdminAnywhere } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";
import { audit } from "@/lib/audit";

const schema = z.object({ code: z.string().min(6).max(6) });

// Step 2 of enrollment: prove the authenticator app is actually set up
// correctly before 2FA becomes mandatory on this account.
export const POST = handler(async (req: Request) => {
  const session = await requireUser();
  if (!isAdminAnywhere(session)) {
    return fail("FORBIDDEN", "Two-factor authentication is only available for admin accounts.", 403);
  }

  const { code } = schema.parse(await req.json());
  const user = await db.user.findUniqueOrThrow({ where: { id: session.id } });
  if (!user.twoFactorSecret) {
    return fail("NOT_ENROLLING", "Start enrollment before confirming a code.", 400);
  }
  if (!verifyTotp(user.twoFactorSecret, code)) {
    return fail("INVALID_CODE", "That code didn't match. Check the time on your authenticator app.", 401);
  }

  await db.user.update({ where: { id: session.id }, data: { twoFactorEnabled: true } });
  await audit({
    actorType: "member",
    actorId: session.id,
    action: "auth.2fa_enabled",
    objectType: "user",
    objectId: session.id,
  });

  return ok({ enabled: true });
});

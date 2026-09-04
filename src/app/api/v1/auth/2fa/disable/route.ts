import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";
import { audit } from "@/lib/audit";

const schema = z.object({ code: z.string().min(6).max(6) });

// Requires a valid current code to turn 2FA off — otherwise anyone with a
// hijacked session (but not the authenticator) could strip the protection.
export const POST = handler(async (req: Request) => {
  const session = await requireUser();
  const { code } = schema.parse(await req.json());
  const user = await db.user.findUniqueOrThrow({ where: { id: session.id } });

  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    return fail("NOT_ENABLED", "Two-factor authentication isn't enabled on this account.", 400);
  }
  if (!verifyTotp(user.twoFactorSecret, code)) {
    return fail("INVALID_CODE", "That code didn't match.", 401);
  }

  await db.user.update({ where: { id: session.id }, data: { twoFactorEnabled: false, twoFactorSecret: null } });
  await audit({
    actorType: "member",
    actorId: session.id,
    action: "auth.2fa_disabled",
    objectType: "user",
    objectId: session.id,
  });

  return ok({ enabled: false });
});

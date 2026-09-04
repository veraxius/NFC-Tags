import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser, isAdminAnywhere } from "@/lib/auth";
import { generateTotpSecret, totpAuthUrl } from "@/lib/totp";

// Step 1 of enrollment: generate a secret and hand back the otpauth:// URL
// (for scanning) plus the raw key (for manual entry). The secret is saved
// but twoFactorEnabled stays false until /2fa/confirm proves the user can
// actually produce a valid code with it — otherwise a half-finished
// enrollment could brick a login.
export const POST = handler(async () => {
  const session = await requireUser();
  if (!isAdminAnywhere(session)) {
    return fail("FORBIDDEN", "Two-factor authentication is only available for admin accounts.", 403);
  }

  const secret = generateTotpSecret();
  await db.user.update({ where: { id: session.id }, data: { twoFactorSecret: secret } });

  return ok({
    secret,
    otpauthUrl: totpAuthUrl({ secret, accountLabel: session.email }),
  });
});

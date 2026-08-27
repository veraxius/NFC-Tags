import { z } from "zod";
import { db } from "@/lib/db";
import { ok, handler } from "@/lib/api";
import { generateOpaqueToken, hashOpaqueToken } from "@/lib/ids";
import { audit } from "@/lib/audit";

const schema = z.object({ email: z.string().email() });

// TRS 27 — POST /auth/forgot-password
// Always returns the same response whether or not the address exists, so the
// endpoint cannot be used to enumerate registered members (TRS §52).
export const POST = handler(async (req: Request) => {
  const { email } = schema.parse(await req.json());
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });

  let devToken: string | undefined;

  if (user && user.status === "active") {
    const { token, tokenHash } = generateOpaqueToken();
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });
    await audit({
      actorType: "system",
      actorId: user.id,
      action: "auth.password_reset_requested",
      objectType: "user",
      objectId: user.id,
    });
    // The MVP has no email delivery (TRS §3 keeps external channels out of
    // scope). Outside production the token is returned so the flow is
    // testable end to end; in production it must be delivered out of band.
    if (process.env.NODE_ENV !== "production") devToken = token;
  }

  return ok({
    message: "If an account exists for that email, a reset link has been issued.",
    ...(devToken ? { dev_reset_token: devToken } : {}),
  });
});

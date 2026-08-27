import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { generateOpaqueToken, hashOpaqueToken } from "@/lib/ids";
import { audit } from "@/lib/audit";

const schema = z.object({ token: z.string().min(10) });

// TRS 27 — POST /auth/verify-email
// Confirms an address using a single-use token.
export const POST = handler(async (req: Request) => {
  const body = schema.parse(await req.json());

  const record = await db.emailVerificationToken.findUnique({
    where: { tokenHash: hashOpaqueToken(body.token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return fail("INVALID_VERIFICATION_TOKEN", "This verification link is invalid or has expired.", 400);
  }

  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
    db.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  await audit({
    actorType: "member",
    actorId: record.userId,
    action: "auth.email_verified",
    objectType: "user",
    objectId: record.userId,
  });

  return ok({ verified: true });
});

// Issues (or re-issues) a verification token for the signed-in member.
export const GET = handler(async () => {
  const session = await requireUser();
  const { token, tokenHash } = generateOpaqueToken();

  await db.emailVerificationToken.create({
    data: {
      userId: session.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });

  await audit({
    actorType: "member",
    actorId: session.id,
    action: "auth.email_verification_requested",
    objectType: "user",
    objectId: session.id,
  });

  // No email delivery in the MVP — see forgot-password for the same note.
  return ok({
    message: "Verification token issued.",
    ...(process.env.NODE_ENV !== "production" ? { dev_verification_token: token } : {}),
  });
});

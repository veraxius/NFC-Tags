import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { hashOpaqueToken } from "@/lib/ids";
import { audit } from "@/lib/audit";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});

// TRS 27 — POST /auth/reset-password
export const POST = handler(async (req: Request) => {
  const body = schema.parse(await req.json());

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashOpaqueToken(body.token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return fail("INVALID_RESET_TOKEN", "This reset link is invalid or has expired.", 400);
  }

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(body.password) },
    }),
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await audit({
    actorType: "member",
    actorId: record.userId,
    action: "auth.password_reset_completed",
    objectType: "user",
    objectId: record.userId,
  });

  return ok({ reset: true });
});

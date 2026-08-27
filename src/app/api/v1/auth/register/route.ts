import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { hashPassword, createSession } from "@/lib/auth";
import { journeyPublicId } from "@/lib/ids";
import { audit } from "@/lib/audit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  consentTerms: z.literal(true), // US-001: required consent is captured
  consentDataProcessing: z.literal(true),
});

export const POST = handler(async (req: Request) => {
  const body = schema.parse(await req.json());

  const existing = await db.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (existing) return fail("EMAIL_IN_USE", "An account with this email already exists.", 409);

  const user = await db.user.create({
    data: {
      email: body.email.toLowerCase(),
      passwordHash: await hashPassword(body.password),
      firstName: body.firstName,
      lastName: body.lastName,
      displayName: `${body.firstName} ${body.lastName}`,
      status: "active", // MVP: email verification flow stubbed
      emailVerified: false,
      journeyIdentity: { create: { publicId: journeyPublicId() } },
      consents: {
        create: [
          { consentType: "terms", policyVersion: "1.0", granted: true, grantedAt: new Date() },
          { consentType: "data_processing", policyVersion: "1.0", granted: true, grantedAt: new Date() },
        ],
      },
    },
    include: { journeyIdentity: true },
  });

  await audit({
    actorType: "member",
    actorId: user.id,
    action: "user.registered",
    objectType: "user",
    objectId: user.id,
    newState: { email: user.email, journeyId: user.journeyIdentity?.publicId },
  });

  await createSession(user.id);
  return ok({ id: user.id, journeyId: user.journeyIdentity?.publicId }, { status: 201 });
});

import { z } from "zod";
import { db } from "@/lib/db";
import { ok, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

// TRS 28 — GET /users/me
export const GET = handler(async () => {
  const session = await requireUser();
  const user = await db.user.findUniqueOrThrow({
    where: { id: session.id },
    include: { journeyIdentity: true },
  });
  return ok({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    emailVerified: user.emailVerified,
    journeyId: user.journeyIdentity?.publicId,
    profileVisibility: user.journeyIdentity?.profileVisibility,
    platformRole: user.platformRole,
  });
});

const patchSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  displayName: z.string().min(1).optional(),
});

// TRS 28 — PATCH /users/me
export const PATCH = handler(async (req: Request) => {
  const session = await requireUser();
  const body = patchSchema.parse(await req.json());

  const before = await db.user.findUniqueOrThrow({ where: { id: session.id } });
  const user = await db.user.update({
    where: { id: session.id },
    data: body,
    include: { journeyIdentity: true },
  });

  await audit({
    actorType: "member",
    actorId: session.id,
    action: "user.profile_updated",
    objectType: "user",
    objectId: session.id,
    previousState: {
      firstName: before.firstName,
      lastName: before.lastName,
      displayName: before.displayName,
    },
    newState: body,
  });

  return ok({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    journeyId: user.journeyIdentity?.publicId,
  });
});

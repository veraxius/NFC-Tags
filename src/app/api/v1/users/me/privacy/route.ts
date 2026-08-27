import { z } from "zod";
import { db } from "@/lib/db";
import { ok, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

// TRS 28 — GET /users/me/privacy
export const GET = handler(async () => {
  const session = await requireUser();
  const [identity, prefs] = await Promise.all([
    db.journeyIdentity.findUniqueOrThrow({ where: { userId: session.id } }),
    db.privacyPreference.findMany({ where: { userId: session.id } }),
  ]);
  return ok({
    profile_visibility: identity.profileVisibility,
    preferences: Object.fromEntries(prefs.map((p) => [p.key, p.value])),
  });
});

const patchSchema = z.object({
  profile_visibility: z.enum(["private", "partners", "public"]).optional(),
  preferences: z.record(z.string(), z.string()).optional(),
});

// TRS 28 — PATCH /users/me/privacy
export const PATCH = handler(async (req: Request) => {
  const session = await requireUser();
  const body = patchSchema.parse(await req.json());

  const before = await db.journeyIdentity.findUniqueOrThrow({ where: { userId: session.id } });

  if (body.profile_visibility) {
    await db.journeyIdentity.update({
      where: { userId: session.id },
      data: { profileVisibility: body.profile_visibility },
    });
    await audit({
      actorType: "member",
      actorId: session.id,
      action: "privacy.visibility_changed",
      objectType: "journey_identity",
      objectId: before.id,
      previousState: { profileVisibility: before.profileVisibility },
      newState: { profileVisibility: body.profile_visibility },
    });
  }

  if (body.preferences) {
    for (const [key, value] of Object.entries(body.preferences)) {
      await db.privacyPreference.upsert({
        where: { userId_key: { userId: session.id, key } },
        create: { userId: session.id, key, value },
        update: { value },
      });
    }
    await audit({
      actorType: "member",
      actorId: session.id,
      action: "privacy.preferences_changed",
      objectType: "user",
      objectId: session.id,
      newState: body.preferences,
    });
  }

  const [identity, prefs] = await Promise.all([
    db.journeyIdentity.findUniqueOrThrow({ where: { userId: session.id } }),
    db.privacyPreference.findMany({ where: { userId: session.id } }),
  ]);

  return ok({
    profile_visibility: identity.profileVisibility,
    preferences: Object.fromEntries(prefs.map((p) => [p.key, p.value])),
  });
});

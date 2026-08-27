import { z } from "zod";
import { db } from "@/lib/db";
import { ok, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

// TRS 28 — GET /users/me/consents
// Returns the full append-only history plus the current state per type
// (TRS §20: "Consent history SHALL NOT be silently overwritten").
export const GET = handler(async () => {
  const session = await requireUser();
  const consents = await db.consent.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
  });

  const current = new Map<string, (typeof consents)[number]>();
  for (const c of consents) if (!current.has(c.consentType)) current.set(c.consentType, c);

  return ok({
    current: [...current.values()].map((c) => ({
      consent_type: c.consentType,
      granted: c.granted,
      policy_version: c.policyVersion,
      recorded_at: c.createdAt,
    })),
    history: consents.map((c) => ({
      consent_type: c.consentType,
      granted: c.granted,
      policy_version: c.policyVersion,
      granted_at: c.grantedAt,
      revoked_at: c.revokedAt,
      source: c.source,
      created_at: c.createdAt,
    })),
  });
});

const postSchema = z.object({
  consent_type: z.string().min(1),
  granted: z.boolean(),
  policy_version: z.string().default("1.0"),
});

// Records a new consent decision. Always appends — never updates in place.
export const POST = handler(async (req: Request) => {
  const session = await requireUser();
  const body = postSchema.parse(await req.json());

  const consent = await db.consent.create({
    data: {
      userId: session.id,
      consentType: body.consent_type,
      policyVersion: body.policy_version,
      granted: body.granted,
      grantedAt: body.granted ? new Date() : null,
      revokedAt: body.granted ? null : new Date(),
      source: "api",
    },
  });

  await audit({
    actorType: "member",
    actorId: session.id,
    action: body.granted ? "consent.granted" : "consent.revoked",
    objectType: "consent",
    objectId: consent.id,
    newState: { consentType: body.consent_type, granted: body.granted },
  });

  return ok({ consent_type: consent.consentType, granted: consent.granted }, { status: 201 });
});

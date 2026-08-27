import { db } from "./db";
import { audit } from "./audit";
import { SessionUser, canActForPartner, actorTypeFor } from "./auth";
import { earthyDoingPublicId } from "./ids";

// TRS 13 — Earthy Doing lifecycle:
// draft -> published -> active -> completed, with paused / cancelled /
// archived as side states (TRS §44 exposes Publish/Pause/Cancel/Archive).

export class EarthyDoingError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["published", "cancelled", "archived"],
  published: ["active", "paused", "cancelled", "archived"],
  active: ["paused", "completed", "cancelled"],
  paused: ["published", "active", "cancelled", "archived"],
  completed: ["archived"],
  cancelled: ["archived"],
  archived: [],
};

export function canTransition(from: string, to: string): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

export async function resolveEarthyDoing(idOrPublicId: string) {
  const doing = await db.earthyDoing.findFirst({
    where: { OR: [{ id: idOrPublicId }, { publicId: idOrPublicId }] },
  });
  if (!doing) throw new EarthyDoingError("EVENT_NOT_FOUND", "Earthy Doing not found.", 404);
  return doing;
}

export function assertCanManage(partnerId: string, session: SessionUser): void {
  if (!canActForPartner(session, partnerId)) {
    throw new EarthyDoingError(
      "FORBIDDEN",
      "You are not authorized to manage this partner's Earthy Doings.",
      403
    );
  }
}

export const DIMENSIONS = [
  "SELF_SUSTAINABILITY",
  "EMOTIONAL_PROSPERITY",
  "ENVIRONMENTAL_EQUITY",
] as const;

export async function createEarthyDoing(params: {
  session: SessionUser;
  partnerId: string;
  programId?: string | null;
  title: string;
  description: string;
  category: string;
  startAt: Date;
  endAt: Date;
  locationId?: string | null;
  capacity?: number | null;
  dimensions: string[];
  verificationPolicyId?: string | null;
  status?: string;
}) {
  assertCanManage(params.partnerId, params.session);

  if (params.endAt <= params.startAt) {
    throw new EarthyDoingError("INVALID_DATE_RANGE", "End time must be after start time.", 422);
  }
  const invalid = params.dimensions.filter(
    (d) => !DIMENSIONS.includes(d as (typeof DIMENSIONS)[number])
  );
  if (invalid.length > 0) {
    throw new EarthyDoingError(
      "INVALID_TRISILIENCE_DIMENSION",
      `Unknown TriSilience dimension(s): ${invalid.join(", ")}.`,
      422
    );
  }

  // Fall back to the platform default policy when none is specified.
  const policyId =
    params.verificationPolicyId ??
    (await db.verificationPolicy.findFirst({ where: { isDefault: true } }))?.id ??
    null;

  const doing = await db.earthyDoing.create({
    data: {
      publicId: earthyDoingPublicId(),
      partnerId: params.partnerId,
      programId: params.programId ?? null,
      title: params.title,
      description: params.description,
      category: params.category,
      status: params.status ?? "draft",
      startAt: params.startAt,
      endAt: params.endAt,
      locationId: params.locationId ?? null,
      capacity: params.capacity ?? null,
      verificationPolicyId: policyId,
      createdBy: params.session.id,
      classifications: { create: params.dimensions.map((d) => ({ dimension: d })) },
    },
    include: { classifications: true },
  });

  await audit({
    actorType: actorTypeFor(params.session, params.partnerId),
    actorId: params.session.id,
    action: "earthy_doing.created",
    objectType: "earthy_doing",
    objectId: doing.id,
    newState: { title: doing.title, status: doing.status, dimensions: params.dimensions },
  });

  return doing;
}

export async function updateEarthyDoing(params: {
  session: SessionUser;
  idOrPublicId: string;
  data: {
    title?: string;
    description?: string;
    category?: string;
    startAt?: Date;
    endAt?: Date;
    capacity?: number | null;
    locationId?: string | null;
    programId?: string | null;
    dimensions?: string[];
  };
}) {
  const doing = await resolveEarthyDoing(params.idOrPublicId);
  assertCanManage(doing.partnerId, params.session);

  if (["archived", "cancelled"].includes(doing.status)) {
    throw new EarthyDoingError(
      "INVALID_STATE",
      `An Earthy Doing in status '${doing.status}' can no longer be edited.`,
      409
    );
  }

  const start = params.data.startAt ?? doing.startAt;
  const end = params.data.endAt ?? doing.endAt;
  if (end <= start) {
    throw new EarthyDoingError("INVALID_DATE_RANGE", "End time must be after start time.", 422);
  }

  const { dimensions, ...scalar } = params.data;

  const updated = await db.earthyDoing.update({
    where: { id: doing.id },
    data: scalar,
    include: { classifications: true },
  });

  // TriSilience classification is stored independently of verification
  // (Architecture doc §9), so it can be corrected at any time before archive.
  if (dimensions) {
    const invalid = dimensions.filter(
      (d) => !DIMENSIONS.includes(d as (typeof DIMENSIONS)[number])
    );
    if (invalid.length > 0) {
      throw new EarthyDoingError(
        "INVALID_TRISILIENCE_DIMENSION",
        `Unknown TriSilience dimension(s): ${invalid.join(", ")}.`,
        422
      );
    }
    await db.triSilienceClassification.deleteMany({ where: { earthyDoingId: doing.id } });
    await db.triSilienceClassification.createMany({
      data: dimensions.map((d) => ({ earthyDoingId: doing.id, dimension: d })),
    });
  }

  await audit({
    actorType: actorTypeFor(params.session, doing.partnerId),
    actorId: params.session.id,
    action: "earthy_doing.updated",
    objectType: "earthy_doing",
    objectId: doing.id,
    previousState: {
      title: doing.title,
      startAt: doing.startAt,
      endAt: doing.endAt,
      capacity: doing.capacity,
    },
    newState: params.data,
  });

  return db.earthyDoing.findUniqueOrThrow({
    where: { id: updated.id },
    include: { classifications: true },
  });
}

export async function transitionEarthyDoing(params: {
  session: SessionUser;
  idOrPublicId: string;
  to: string;
  reason?: string;
}) {
  const doing = await resolveEarthyDoing(params.idOrPublicId);
  assertCanManage(doing.partnerId, params.session);

  if (!canTransition(doing.status, params.to)) {
    throw new EarthyDoingError(
      "INVALID_STATE",
      `An Earthy Doing cannot move from '${doing.status}' to '${params.to}'.`,
      409
    );
  }

  const updated = await db.earthyDoing.update({
    where: { id: doing.id },
    data: { status: params.to },
  });

  await audit({
    actorType: actorTypeFor(params.session, doing.partnerId),
    actorId: params.session.id,
    action: `earthy_doing.${params.to}`,
    objectType: "earthy_doing",
    objectId: doing.id,
    previousState: { status: doing.status },
    newState: { status: params.to },
    reason: params.reason,
  });

  return updated;
}

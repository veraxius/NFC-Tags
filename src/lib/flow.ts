import { db } from "./db";
import { audit } from "./audit";
import { requestAimAssessment } from "./aim";
import { participationPublicId, milestonePublicId } from "./ids";

// Core transaction flow (Architecture doc §12 / TRS §36 state machine):
// TAP → participation(detected) → complete → verification(pending)
// → partner approve (+evidence) → AIM assess → milestone VERIFIED

export class FlowError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Called from the NFC tap resolution when an active Earthy Doing exists.
export async function recordParticipation(params: {
  userId: string;
  deviceId: string | null;
  earthyDoingId: string;
  interactionType?: string;
}) {
  const doing = await db.earthyDoing.findUniqueOrThrow({
    where: { id: params.earthyDoingId },
  });
  if (!["published", "active"].includes(doing.status)) {
    throw new FlowError("EVENT_NOT_ACTIVE", "This Earthy Doing is not open for participation.");
  }

  // Duplicate protection (US-003)
  const existing = await db.participation.findUnique({
    where: {
      earthyDoingId_userId: { earthyDoingId: doing.id, userId: params.userId },
    },
  });
  if (existing) return { participation: existing, duplicate: true };

  if (doing.capacity != null) {
    const count = await db.participation.count({
      where: { earthyDoingId: doing.id, status: { notIn: ["cancelled", "invalid"] } },
    });
    if (count >= doing.capacity) {
      throw new FlowError("EVENT_FULL", "This Earthy Doing has reached capacity.");
    }
  }

  const participation = await db.participation.create({
    data: {
      publicId: participationPublicId(),
      earthyDoingId: doing.id,
      userId: params.userId,
      deviceId: params.deviceId,
      partnerId: doing.partnerId,
      interactionType: params.interactionType ?? "nfc",
      checkInAt: new Date(),
      locationId: doing.locationId,
      status: "detected",
    },
  });

  await audit({
    actorType: "member",
    actorId: params.userId,
    action: "participation.recorded",
    objectType: "participation",
    objectId: participation.id,
    newState: { status: "detected", earthyDoingId: doing.id },
  });

  return { participation, duplicate: false };
}

// Partner marks the participation completed → creates the pending verification
// with the NFC evidence attached.
export async function completeParticipation(participationId: string, actorId: string, actorType: string) {
  const p = await db.participation.findUniqueOrThrow({
    where: { id: participationId },
    include: { verification: true },
  });
  if (p.verification) return p.verification;
  if (["cancelled", "invalid"].includes(p.status)) {
    throw new FlowError("INVALID_STATE", "Participation cannot be completed from its current state.");
  }

  const [, verification] = await db.$transaction([
    db.participation.update({
      where: { id: p.id },
      data: { status: "verification_pending", checkOutAt: new Date() },
    }),
    db.verification.create({
      data: {
        participationId: p.id,
        partnerId: p.partnerId,
        status: "pending",
        verificationMethod: p.interactionType === "nfc" ? "nfc+partner_confirmation" : "partner_confirmation",
      },
    }),
  ]);

  if (p.interactionType === "nfc" && p.deviceId) {
    await db.evidence.create({
      data: {
        verificationId: verification.id,
        evidenceType: "nfc_tap",
        source: "journeyport_nfc",
        metadata: JSON.stringify({ deviceId: p.deviceId, checkInAt: p.checkInAt }),
      },
    });
  }
  await db.evidence.create({
    data: {
      verificationId: verification.id,
      evidenceType: "timestamp",
      source: "journeyport_platform",
      metadata: JSON.stringify({ checkInAt: p.checkInAt, checkOutAt: new Date() }),
    },
  });

  await audit({
    actorType,
    actorId,
    action: "participation.completed",
    objectType: "participation",
    objectId: p.id,
    previousState: { status: p.status },
    newState: { status: "verification_pending", verificationId: verification.id },
  });

  return verification;
}

// Partner approves → partner_confirmation evidence → AIM → milestone.
export async function approveVerification(params: {
  verificationId: string;
  actorId: string;
  actorType: string;
  notes?: string;
}) {
  const v = await db.verification.findUniqueOrThrow({
    where: { id: params.verificationId },
    include: { participation: true },
  });
  if (!["pending", "review"].includes(v.status)) {
    throw new FlowError("INVALID_STATE", `Verification cannot be approved from status '${v.status}'.`);
  }

  await db.evidence.create({
    data: {
      verificationId: v.id,
      evidenceType: "partner_confirmation",
      source: "partner_dashboard",
      metadata: JSON.stringify({ confirmedBy: params.actorId, notes: params.notes ?? null }),
    },
  });

  // AIM evaluation (TRS 37: policy = NFC + partner confirmation + AIM)
  const assessment = await requestAimAssessment(v.id);
  const credible = assessment.assessmentResult === "credible";
  const finalStatus = credible ? "verified" : "review";

  const updated = await db.verification.update({
    where: { id: v.id },
    data: {
      status: finalStatus,
      verifiedBy: params.actorId,
      verifiedAt: credible ? new Date() : null,
      notes: params.notes ?? null,
      reasonCode: credible ? null : "AIM_NOT_CREDIBLE",
    },
  });

  await audit({
    actorType: params.actorType,
    actorId: params.actorId,
    action: credible ? "verification.approved" : "verification.needs_review",
    objectType: "verification",
    objectId: v.id,
    previousState: { status: v.status },
    newState: { status: finalStatus, aim: assessment.assessmentResult },
  });

  // Milestone engine
  const milestone = await db.journeyMilestone.upsert({
    where: { participationId: v.participationId },
    create: {
      publicId: milestonePublicId(),
      userId: v.participation.userId,
      earthyDoingId: v.participation.earthyDoingId,
      participationId: v.participationId,
      verificationId: v.id,
      aimAssessmentId: assessment.id,
      status: credible ? "verified" : "pending",
      earnedAt: v.participation.checkInAt,
      verifiedAt: credible ? new Date() : null,
    },
    update: {
      status: credible ? "verified" : "pending",
      aimAssessmentId: assessment.id,
      verifiedAt: credible ? new Date() : null,
    },
  });

  if (credible) {
    await db.participation.update({ where: { id: v.participationId }, data: { status: "completed" } });
  }

  await audit({
    actorType: "system",
    action: credible ? "milestone.verified" : "milestone.pending",
    objectType: "journey_milestone",
    objectId: milestone.id,
    newState: { status: milestone.status },
  });

  return { verification: updated, assessment, milestone };
}

export async function rejectVerification(params: {
  verificationId: string;
  actorId: string;
  actorType: string;
  reasonCode: string;
  notes?: string;
}) {
  const v = await db.verification.findUniqueOrThrow({ where: { id: params.verificationId } });
  if (!["pending", "review"].includes(v.status)) {
    throw new FlowError("INVALID_STATE", `Verification cannot be rejected from status '${v.status}'.`);
  }
  const updated = await db.verification.update({
    where: { id: v.id },
    data: { status: "rejected", verifiedBy: params.actorId, reasonCode: params.reasonCode, notes: params.notes ?? null },
  });
  await db.participation.update({ where: { id: v.participationId }, data: { status: "invalid" } });
  await db.journeyMilestone.updateMany({
    where: { verificationId: v.id },
    data: { status: "rejected" },
  });
  await audit({
    actorType: params.actorType,
    actorId: params.actorId,
    action: "verification.rejected",
    objectType: "verification",
    objectId: v.id,
    previousState: { status: v.status },
    newState: { status: "rejected", reasonCode: params.reasonCode },
  });
  return updated;
}

export async function revokeVerification(params: {
  verificationId: string;
  actorId: string;
  actorType: string;
  reason: string;
}) {
  const v = await db.verification.findUniqueOrThrow({ where: { id: params.verificationId } });
  if (v.status !== "verified") {
    throw new FlowError("INVALID_STATE", "Only verified records can be revoked.");
  }
  const updated = await db.verification.update({
    where: { id: v.id },
    data: { status: "revoked", reasonCode: "REVOKED", notes: params.reason },
  });
  await db.journeyMilestone.updateMany({
    where: { verificationId: v.id },
    data: { status: "revoked", revokedAt: new Date() },
  });
  await audit({
    actorType: params.actorType,
    actorId: params.actorId,
    action: "verification.revoked",
    objectType: "verification",
    objectId: v.id,
    previousState: { status: "verified" },
    newState: { status: "revoked" },
    reason: params.reason,
  });
  return updated;
}

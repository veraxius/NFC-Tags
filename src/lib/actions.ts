"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "./db";
import {
  requireUser,
  isBeaurityAdmin,
  canActForPartner,
  partnerRole,
  destroySession,
} from "./auth";

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
import {
  hashNfcToken,
  earthyDoingPublicId,
  generateNfcToken,
  devicePublicId,
  disputePublicId,
} from "./ids";
import { audit } from "./audit";
import {
  recordParticipation,
  completeParticipation,
  approveVerification,
  rejectVerification,
  revokeVerification,
  FlowError,
} from "./flow";

function actorTypeFor(session: Awaited<ReturnType<typeof requireUser>>, partnerId?: string) {
  if (session.platformRole === "super_admin") return "super_admin";
  if (session.platformRole === "beaurity_admin") return "beaurity_admin";
  if (partnerId && partnerRole(session, partnerId) === "administrator") return "partner_admin";
  if (partnerId && partnerRole(session, partnerId) === "operator") return "partner_operator";
  return "member";
}

// ---- NFC tap actions (used by /t/[token]) ----

export async function activateDeviceAction(token: string) {
  const session = await requireUser();
  const device = await db.journeyPortDevice.findUnique({ where: { tokenHash: hashNfcToken(token) } });
  if (!device) throw new Error("Device not found");
  if (!["inventory", "assigned"].includes(device.status)) throw new Error("Device cannot be activated");
  if (device.userId && device.userId !== session.id) throw new Error("Device assigned to another member");
  await db.journeyPortDevice.update({
    where: { id: device.id },
    data: { userId: session.id, status: "active", activatedAt: new Date(), issuedAt: device.issuedAt ?? new Date() },
  });
  await audit({
    actorType: "member", actorId: session.id, action: "device.activated",
    objectType: "journeyport_device", objectId: device.id,
    previousState: { status: device.status }, newState: { status: "active", userId: session.id },
  });
  redirect(`/t/${token}?activated=1`);
}

export async function tapParticipateAction(token: string, earthyDoingId: string) {
  const session = await requireUser();
  const device = await db.journeyPortDevice.findUnique({ where: { tokenHash: hashNfcToken(token) } });
  if (!device || device.status !== "active" || device.userId !== session.id) {
    throw new Error("JourneyPort device is not active for this member");
  }
  await db.journeyPortDevice.update({ where: { id: device.id }, data: { lastUsedAt: new Date() } });
  try {
    await recordParticipation({ userId: session.id, deviceId: device.id, earthyDoingId, interactionType: "nfc" });
  } catch (e) {
    if (e instanceof FlowError) redirect(`/t/${token}?error=${e.code}`);
    throw e;
  }
  redirect(`/t/${token}?participated=${earthyDoingId}`);
}

// ---- Partner actions ----

export async function completeParticipationAction(participationId: string) {
  const session = await requireUser();
  const p = await db.participation.findUniqueOrThrow({ where: { id: participationId } });
  if (!canActForPartner(session, p.partnerId)) throw new Error("Forbidden");
  await completeParticipation(participationId, session.id, actorTypeFor(session, p.partnerId));
  revalidatePath("/partner");
  revalidatePath("/ops");
}

export async function approveVerificationAction(verificationId: string, notes?: string) {
  const session = await requireUser();
  const v = await db.verification.findUniqueOrThrow({ where: { id: verificationId } });
  if (!canActForPartner(session, v.partnerId)) throw new Error("Forbidden");
  await approveVerification({
    verificationId,
    actorId: session.id,
    actorType: actorTypeFor(session, v.partnerId),
    notes,
  });
  revalidatePath("/partner");
  revalidatePath("/ops");
}

export async function rejectVerificationAction(verificationId: string, reasonCode: string) {
  const session = await requireUser();
  const v = await db.verification.findUniqueOrThrow({ where: { id: verificationId } });
  if (!canActForPartner(session, v.partnerId)) throw new Error("Forbidden");
  await rejectVerification({
    verificationId,
    actorId: session.id,
    actorType: actorTypeFor(session, v.partnerId),
    reasonCode,
  });
  revalidatePath("/partner");
  revalidatePath("/ops");
}

export async function revokeVerificationAction(verificationId: string, reason: string) {
  const session = await requireUser();
  if (!isBeaurityAdmin(session)) throw new Error("Forbidden");
  await revokeVerification({
    verificationId,
    actorId: session.id,
    actorType: actorTypeFor(session),
    reason,
  });
  revalidatePath("/ops");
}

export async function createEarthyDoingAction(formData: FormData) {
  const session = await requireUser();
  const partnerId = String(formData.get("partnerId"));
  const { createEarthyDoing } = await import("./earthyDoings");

  // Shares the same validation, policy assignment and audit trail as
  // POST /api/v1/earthy-doings — the dashboard is not a second code path.
  await createEarthyDoing({
    session,
    partnerId,
    title: String(formData.get("title")),
    description: String(formData.get("description") ?? ""),
    category: String(formData.get("category") ?? "general"),
    startAt: new Date(String(formData.get("startAt"))),
    endAt: new Date(String(formData.get("endAt"))),
    capacity: formData.get("capacity") ? Number(formData.get("capacity")) : null,
    dimensions: formData.getAll("dimensions").map(String),
    status: "published",
  });

  revalidatePath("/partner");
  redirect("/partner");
}

// ---- Ops actions ----

export async function addDeviceInventoryAction(formData: FormData) {
  const session = await requireUser();
  if (!isBeaurityAdmin(session)) throw new Error("Forbidden");
  const count = Math.min(Number(formData.get("count") ?? 1), 50);
  const type = String(formData.get("deviceType") ?? "card");
  const tokens: { deviceId: string; token: string }[] = [];
  for (let i = 0; i < count; i++) {
    const { token, tokenHash } = generateNfcToken();
    const device = await db.journeyPortDevice.create({
      data: { publicDeviceId: devicePublicId(), tokenHash, deviceType: type, status: "inventory" },
    });
    tokens.push({ deviceId: device.publicDeviceId, token });
    await audit({
      actorType: actorTypeFor(session), actorId: session.id,
      action: "device.added_to_inventory", objectType: "journeyport_device", objectId: device.id,
      newState: { deviceType: type },
    });
  }
  revalidatePath("/ops/devices");
  // Tokens are shown once (they are stored only as hashes) via querystring flash.
  redirect(`/ops/devices?created=${encodeURIComponent(JSON.stringify(tokens))}`);
}

export async function setDeviceStatusAction(deviceId: string, status: string, reason: string) {
  const session = await requireUser();
  const device = await db.journeyPortDevice.findUniqueOrThrow({ where: { id: deviceId } });
  const own = device.userId === session.id;
  if (!own && !isBeaurityAdmin(session)) throw new Error("Forbidden");
  const allowed = ["suspended", "lost", "stolen", "revoked", "active", "retired"];
  if (!allowed.includes(status)) throw new Error("Invalid status");
  await db.journeyPortDevice.update({
    where: { id: deviceId },
    data: { status, revokedAt: ["revoked", "lost", "stolen"].includes(status) ? new Date() : null },
  });
  await audit({
    actorType: own && !isBeaurityAdmin(session) ? "member" : actorTypeFor(session),
    actorId: session.id, action: `device.${status}`,
    objectType: "journeyport_device", objectId: deviceId,
    previousState: { status: device.status }, newState: { status }, reason,
  });
  revalidatePath("/ops/devices");
  revalidatePath("/journey");
}

// TRS 44 — Earthy Doings screen actions: Publish | Pause | Cancel | Archive
export async function transitionEarthyDoingAction(idOrPublicId: string, to: string) {
  const session = await requireUser();
  const { transitionEarthyDoing } = await import("./earthyDoings");
  await transitionEarthyDoing({ session, idOrPublicId, to });
  revalidatePath("/ops/doings");
  revalidatePath("/partner/doings");
}

// TRS 46 — Device Center action: Assign a device from inventory to a member
export async function assignDeviceAction(deviceId: string, journeyIdOrEmail: string) {
  const session = await requireUser();
  if (!isBeaurityAdmin(session)) throw new Error("Forbidden");

  const query = journeyIdOrEmail.trim();
  const user = await db.user.findFirst({
    where: {
      OR: [{ email: query.toLowerCase() }, { journeyIdentity: { publicId: query } }],
    },
  });
  if (!user) throw new Error("No member found for that Journey ID or email");

  const device = await db.journeyPortDevice.findUniqueOrThrow({ where: { id: deviceId } });
  if (device.status !== "inventory") {
    throw new Error(`Only devices in inventory can be assigned (this one is '${device.status}')`);
  }

  await db.journeyPortDevice.update({
    where: { id: deviceId },
    data: { userId: user.id, status: "assigned", issuedAt: device.issuedAt ?? new Date() },
  });
  await audit({
    actorType: actorTypeFor(session), actorId: session.id,
    action: "device.assigned", objectType: "journeyport_device", objectId: deviceId,
    previousState: { status: device.status, userId: device.userId },
    newState: { status: "assigned", userId: user.id },
  });
  revalidatePath("/ops/devices");
}

// TRS 46 — Device Center action: Replace. The new token is shown once via a
// querystring flash, exactly like new inventory, because only its hash is
// stored (TRS §23).
export async function replaceDeviceAction(deviceId: string) {
  const session = await requireUser();
  if (!isBeaurityAdmin(session)) throw new Error("Forbidden");
  const { replaceDevice } = await import("./devices");
  const { replacement, token } = await replaceDevice({
    idOrPublicId: deviceId,
    session,
    actorType: actorTypeFor(session),
    reason: "replaced_from_device_center",
  });
  revalidatePath("/ops/devices");
  redirect(
    `/ops/devices?created=${encodeURIComponent(
      JSON.stringify([{ deviceId: replacement.publicDeviceId, token }])
    )}`
  );
}

export async function setPartnerStatusAction(partnerId: string, status: string) {
  const session = await requireUser();
  if (!isBeaurityAdmin(session)) throw new Error("Forbidden");
  const partner = await db.partner.findUniqueOrThrow({ where: { id: partnerId } });
  await db.partner.update({
    where: { id: partnerId },
    data: { status, approvedAt: status === "approved" || status === "active" ? partner.approvedAt ?? new Date() : partner.approvedAt },
  });
  await audit({
    actorType: actorTypeFor(session), actorId: session.id,
    action: `partner.${status}`, objectType: "partner", objectId: partnerId,
    previousState: { status: partner.status }, newState: { status },
  });
  revalidatePath("/ops/partners");
}

// ---- Member actions ----

export async function openDisputeAction(formData: FormData) {
  const session = await requireUser();
  const milestoneId = String(formData.get("milestoneId"));
  const milestone = await db.journeyMilestone.findUniqueOrThrow({ where: { id: milestoneId } });
  if (milestone.userId !== session.id) throw new Error("Forbidden");
  const dispute = await db.dispute.create({
    data: {
      publicId: disputePublicId(),
      milestoneId,
      openedBy: session.id,
      reason: String(formData.get("reason")),
      description: String(formData.get("description") ?? ""),
    },
  });
  await db.journeyMilestone.update({ where: { id: milestoneId }, data: { status: "disputed" } });
  await db.verification.update({ where: { id: milestone.verificationId }, data: { status: "disputed" } });
  await audit({
    actorType: "member", actorId: session.id,
    action: "dispute.opened", objectType: "dispute", objectId: dispute.id,
    newState: { milestoneId, reason: dispute.reason },
  });
  revalidatePath("/journey");
  redirect("/journey");
}

// TRS 49 — dispute workflow: OPEN -> UNDER REVIEW -> RESOLVED.
// Taking a case assigns it to the reviewing administrator, so the queue
// shows who is handling what.
export async function startDisputeReviewAction(disputeId: string) {
  const session = await requireUser();
  if (!isBeaurityAdmin(session)) throw new Error("Forbidden");
  const dispute = await db.dispute.findUniqueOrThrow({ where: { id: disputeId } });
  if (dispute.status !== "open") throw new Error("Only open disputes can be moved to review");

  await db.dispute.update({
    where: { id: disputeId },
    data: { status: "under_review", assignedTo: session.id, underReviewAt: new Date() },
  });
  await audit({
    actorType: actorTypeFor(session), actorId: session.id,
    action: "dispute.under_review", objectType: "dispute", objectId: disputeId,
    previousState: { status: dispute.status }, newState: { status: "under_review" },
  });
  revalidatePath("/ops/disputes");
}

export async function resolveDisputeAction(disputeId: string, outcome: "verified" | "revoked", resolution: string) {
  const session = await requireUser();
  if (!isBeaurityAdmin(session)) throw new Error("Forbidden");
  const dispute = await db.dispute.findUniqueOrThrow({ where: { id: disputeId }, include: { milestone: true } });
  if (dispute.status === "resolved") throw new Error("This dispute is already resolved");
  await db.dispute.update({
    where: { id: disputeId },
    data: {
      status: "resolved",
      resolution,
      resolutionOutcome: outcome,
      resolvedBy: session.id,
      resolvedAt: new Date(),
    },
  });
  await db.journeyMilestone.update({
    where: { id: dispute.milestoneId },
    data: {
      status: outcome,
      revokedAt: outcome === "revoked" ? new Date() : null,
    },
  });
  await db.verification.update({
    where: { id: dispute.milestone.verificationId },
    data: { status: outcome },
  });
  await audit({
    actorType: actorTypeFor(session), actorId: session.id,
    action: "dispute.resolved", objectType: "dispute", objectId: disputeId,
    newState: { outcome, resolution },
  });
  revalidatePath("/ops/disputes");
}

export async function setVisibilityAction(visibility: string) {
  const session = await requireUser();
  const prev = await db.journeyIdentity.findUniqueOrThrow({ where: { userId: session.id } });
  await db.journeyIdentity.update({ where: { userId: session.id }, data: { profileVisibility: visibility } });
  await audit({
    actorType: "member", actorId: session.id,
    action: "privacy.visibility_changed", objectType: "journey_identity", objectId: prev.id,
    previousState: { profileVisibility: prev.profileVisibility }, newState: { profileVisibility: visibility },
  });
  revalidatePath("/journey/privacy");
}

export async function setConsentAction(consentType: string, granted: boolean) {
  const session = await requireUser();
  // TRS 20: history is never overwritten — always append a new record
  const consent = await db.consent.create({
    data: {
      userId: session.id,
      consentType,
      policyVersion: "1.0",
      granted,
      grantedAt: granted ? new Date() : null,
      revokedAt: granted ? null : new Date(),
    },
  });
  await audit({
    actorType: "member", actorId: session.id,
    action: granted ? "consent.granted" : "consent.revoked",
    objectType: "consent", objectId: consent.id,
    newState: { consentType, granted },
  });
  revalidatePath("/journey/privacy");
}

import { db } from "./db";
import { audit } from "./audit";
import { SessionUser, isBeaurityAdmin } from "./auth";
import { devicePublicId, generateNfcToken } from "./ids";

// TRS 6 (Architecture) — JourneyPort device lifecycle:
// manufactured -> inventory -> assigned -> active, with suspended / lost /
// stolen / replaced / revoked / retired as terminal or recoverable states.

export class DeviceError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Which target states a device may move to from its current state.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  inventory: ["assigned", "active", "retired"],
  assigned: ["active", "suspended", "lost", "stolen", "revoked", "inventory"],
  active: ["suspended", "lost", "stolen", "revoked", "replaced", "retired"],
  suspended: ["active", "lost", "stolen", "revoked", "replaced", "retired"],
  lost: ["active", "revoked", "replaced", "retired"],
  stolen: ["revoked", "replaced", "retired"],
  replaced: ["retired"],
  revoked: ["retired"],
  retired: [],
};

export function canTransition(from: string, to: string): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

export async function resolveDevice(idOrPublicId: string) {
  const device = await db.journeyPortDevice.findFirst({
    where: { OR: [{ id: idOrPublicId }, { publicDeviceId: idOrPublicId }] },
  });
  if (!device) throw new DeviceError("DEVICE_NOT_FOUND", "Device not found.", 404);
  return device;
}

// Members may act on their own device; Beaurity admins on any device.
export function assertCanManage(
  device: { userId: string | null },
  session: SessionUser
): void {
  if (isBeaurityAdmin(session)) return;
  if (device.userId === session.id) return;
  throw new DeviceError("FORBIDDEN", "You cannot manage this device.", 403);
}

export async function changeDeviceStatus(params: {
  idOrPublicId: string;
  to: string;
  session: SessionUser;
  actorType: string;
  reason?: string;
}) {
  const device = await resolveDevice(params.idOrPublicId);
  assertCanManage(device, params.session);

  if (!canTransition(device.status, params.to)) {
    throw new DeviceError(
      "INVALID_DEVICE_TRANSITION",
      `A device cannot move from '${device.status}' to '${params.to}'.`,
      409
    );
  }

  const revoking = ["revoked", "lost", "stolen", "replaced"].includes(params.to);
  const updated = await db.journeyPortDevice.update({
    where: { id: device.id },
    data: {
      status: params.to,
      revokedAt: revoking ? new Date() : params.to === "active" ? null : device.revokedAt,
    },
  });

  await audit({
    actorType: params.actorType,
    actorId: params.session.id,
    action: `device.${params.to}`,
    objectType: "journeyport_device",
    objectId: device.id,
    previousState: { status: device.status },
    newState: { status: params.to },
    reason: params.reason,
  });

  return updated;
}

// TRS 29 — POST /devices/{id}/replace
// Issues a fresh device (new token) for the same member and marks the old
// one replaced. Journey history stays attached to the member, not the card
// (US-006: "Existing Journey history remains").
export async function replaceDevice(params: {
  idOrPublicId: string;
  session: SessionUser;
  actorType: string;
  reason?: string;
}) {
  const oldDevice = await resolveDevice(params.idOrPublicId);
  assertCanManage(oldDevice, params.session);

  if (!canTransition(oldDevice.status, "replaced")) {
    throw new DeviceError(
      "INVALID_DEVICE_TRANSITION",
      `A device in status '${oldDevice.status}' cannot be replaced.`,
      409
    );
  }

  const { token, tokenHash } = generateNfcToken();

  const replacement = await db.journeyPortDevice.create({
    data: {
      publicDeviceId: devicePublicId(),
      tokenHash,
      deviceType: oldDevice.deviceType,
      userId: oldDevice.userId,
      status: oldDevice.userId ? "assigned" : "inventory",
      issuedAt: new Date(),
    },
  });

  await db.journeyPortDevice.update({
    where: { id: oldDevice.id },
    data: {
      status: "replaced",
      revokedAt: new Date(),
      replacementDeviceId: replacement.id,
    },
  });

  await audit({
    actorType: params.actorType,
    actorId: params.session.id,
    action: "device.replaced",
    objectType: "journeyport_device",
    objectId: oldDevice.id,
    previousState: { status: oldDevice.status },
    newState: { status: "replaced", replacementDeviceId: replacement.id },
    reason: params.reason,
  });

  // The plaintext token is returned exactly once — only the hash is stored,
  // so it can never be recovered later (TRS §23).
  return { replacement, token };
}

// TRS 29 — GET /devices/{id}/interactions
// Interaction history is derived from the append-only audit trail plus the
// participations the device produced, rather than duplicated into its own
// table (TRS §22 keeps audit_events the single source of truth).
export async function deviceInteractions(deviceId: string) {
  const [taps, participations] = await Promise.all([
    db.auditEvent.findMany({
      where: { objectType: "journeyport_device", objectId: deviceId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.participation.findMany({
      where: { deviceId },
      orderBy: { checkInAt: "desc" },
      include: { earthyDoing: true },
      take: 200,
    }),
  ]);

  return {
    audit: taps.map((a) => ({
      action: a.action,
      actor_type: a.actorType,
      at: a.createdAt,
    })),
    participations: participations.map((p) => ({
      id: p.publicId,
      earthy_doing: p.earthyDoing.title,
      status: p.status,
      check_in_at: p.checkInAt,
    })),
  };
}

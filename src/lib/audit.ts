import { db } from "./db";

// TRS 22/26 — every important transition creates an append-only audit event
export async function audit(params: {
  actorType: string; // member|partner_operator|partner_admin|beaurity_admin|super_admin|system|aim
  actorId?: string | null;
  action: string; // e.g. user.registered, device.activated, verification.approved
  objectType: string;
  objectId: string;
  previousState?: unknown;
  newState?: unknown;
  reason?: string;
}) {
  await db.auditEvent.create({
    data: {
      actorType: params.actorType,
      actorId: params.actorId ?? null,
      action: params.action,
      objectType: params.objectType,
      objectId: params.objectId,
      previousState: params.previousState != null ? JSON.stringify(params.previousState) : null,
      newState: params.newState != null ? JSON.stringify(params.newState) : null,
      reason: params.reason ?? null,
    },
  });
}

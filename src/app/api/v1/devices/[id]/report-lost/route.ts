import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser, isBeaurityAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";

// US-006 — Lost JourneyPort: token becomes unusable, history remains.
export const POST = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  const device = await db.journeyPortDevice.findFirst({
    where: { OR: [{ id }, { publicDeviceId: id }] },
  });
  if (!device) return fail("DEVICE_NOT_FOUND", "Device not found.", 404);
  if (device.userId !== session.id && !isBeaurityAdmin(session)) {
    return fail("FORBIDDEN", "You cannot manage this device.", 403);
  }
  if (!["active", "assigned", "suspended"].includes(device.status)) {
    return fail("INVALID_STATE", `Device cannot be reported lost from status '${device.status}'.`, 409);
  }
  const updated = await db.journeyPortDevice.update({
    where: { id: device.id },
    data: { status: "lost", revokedAt: new Date() },
  });
  await audit({
    actorType: isBeaurityAdmin(session) ? "beaurity_admin" : "member",
    actorId: session.id,
    action: "device.reported_lost",
    objectType: "journeyport_device",
    objectId: device.id,
    previousState: { status: device.status },
    newState: { status: "lost" },
  });
  return ok({ deviceId: updated.publicDeviceId, status: updated.status });
});

import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { hashNfcToken } from "@/lib/ids";
import { audit } from "@/lib/audit";

const schema = z.object({ token: z.string().min(10) });

// US-002 — Activate JourneyPort: authentication required, device associated
// once according to policy, activation timestamp stored, audit event created.
export const POST = handler(async (req: Request) => {
  const session = await requireUser();
  const { token } = schema.parse(await req.json());

  const device = await db.journeyPortDevice.findUnique({
    where: { tokenHash: hashNfcToken(token) },
  });
  if (!device) return fail("DEVICE_NOT_FOUND", "This JourneyPort could not be resolved.", 404);
  if (device.status === "active") {
    return fail("ALREADY_ACTIVE", "This JourneyPort is already activated.", 409);
  }
  if (!["inventory", "assigned"].includes(device.status)) {
    return fail("DEVICE_NOT_ACTIVATABLE", `Device status '${device.status}' does not allow activation.`, 409);
  }
  if (device.userId && device.userId !== session.id) {
    return fail("DEVICE_ASSIGNED_ELSEWHERE", "This JourneyPort is assigned to another member.", 403);
  }

  const updated = await db.journeyPortDevice.update({
    where: { id: device.id },
    data: {
      userId: session.id,
      status: "active",
      activatedAt: new Date(),
      issuedAt: device.issuedAt ?? new Date(),
    },
  });

  await audit({
    actorType: "member",
    actorId: session.id,
    action: "device.activated",
    objectType: "journeyport_device",
    objectId: device.id,
    previousState: { status: device.status },
    newState: { status: "active", userId: session.id },
  });

  return ok({ deviceId: updated.publicDeviceId, status: updated.status });
});

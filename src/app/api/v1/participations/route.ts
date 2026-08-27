import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { hashNfcToken } from "@/lib/ids";
import { recordParticipation, FlowError } from "@/lib/flow";

const schema = z.object({
  earthy_doing_id: z.string(), // public id (ED-...)
  device_token: z.string().optional(),
  interaction_type: z.enum(["nfc", "manual"]).default("nfc"),
});

// TRS 31 — POST /participations
export const POST = handler(async (req: Request) => {
  const session = await requireUser();
  const body = schema.parse(await req.json());

  const doing = await db.earthyDoing.findFirst({
    where: { OR: [{ id: body.earthy_doing_id }, { publicId: body.earthy_doing_id }] },
  });
  if (!doing) return fail("EVENT_NOT_FOUND", "Earthy Doing not found.", 404);

  let deviceId: string | null = null;
  if (body.device_token) {
    const device = await db.journeyPortDevice.findUnique({
      where: { tokenHash: hashNfcToken(body.device_token) },
    });
    if (!device) return fail("DEVICE_NOT_FOUND", "JourneyPort device could not be resolved.", 404);
    if (device.status !== "active") {
      return fail("DEVICE_REVOKED", "JourneyPort device is not active.", 403);
    }
    if (device.userId !== session.id) {
      return fail("DEVICE_MISMATCH", "This JourneyPort belongs to a different member.", 403);
    }
    deviceId = device.id;
    await db.journeyPortDevice.update({ where: { id: device.id }, data: { lastUsedAt: new Date() } });
  }

  try {
    const { participation, duplicate } = await recordParticipation({
      userId: session.id,
      deviceId,
      earthyDoingId: doing.id,
      interactionType: body.interaction_type,
    });
    return ok(
      {
        id: participation.publicId,
        status: participation.status,
        duplicate,
        earthy_doing_id: doing.publicId,
        check_in_at: participation.checkInAt,
      },
      { status: duplicate ? 200 : 201 }
    );
  } catch (e) {
    if (e instanceof FlowError) return fail(e.code, e.message, e.status);
    throw e;
  }
});

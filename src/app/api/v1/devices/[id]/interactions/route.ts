import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { resolveDevice, assertCanManage, deviceInteractions, DeviceError } from "@/lib/devices";

// TRS 29 — GET /devices/{id}/interactions
export const GET = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  try {
    const device = await resolveDevice(id);
    assertCanManage(device, session);
    const interactions = await deviceInteractions(device.id);
    return ok({ device_id: device.publicDeviceId, ...interactions });
  } catch (e) {
    if (e instanceof DeviceError) return fail(e.code, e.message, e.status);
    throw e;
  }
});

import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { resolveDevice, assertCanManage, DeviceError } from "@/lib/devices";

// TRS 29 — GET /devices/{id}
export const GET = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireUser();
  const { id } = await ctx.params;

  try {
    const device = await resolveDevice(id);
    assertCanManage(device, session);
    return ok({
      id: device.publicDeviceId,
      device_type: device.deviceType,
      status: device.status,
      issued_at: device.issuedAt,
      activated_at: device.activatedAt,
      last_used_at: device.lastUsedAt,
      revoked_at: device.revokedAt,
      replacement_device_id: device.replacementDeviceId,
    });
  } catch (e) {
    if (e instanceof DeviceError) return fail(e.code, e.message, e.status);
    throw e;
  }
});

import { ok, fail, handler } from "@/lib/api";
import { requireUser, actorTypeFor } from "@/lib/auth";
import { changeDeviceStatus, DeviceError } from "@/lib/devices";

// TRS 29 — POST /devices/{id}/revoke
// A revoked device can never create a valid interaction again (TRS §52).
export const POST = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  try {
    const device = await changeDeviceStatus({
      idOrPublicId: id,
      to: "revoked",
      session,
      actorType: actorTypeFor(session),
      reason: "revoked_via_api",
    });
    return ok({ id: device.publicDeviceId, status: device.status });
  } catch (e) {
    if (e instanceof DeviceError) return fail(e.code, e.message, e.status);
    throw e;
  }
});

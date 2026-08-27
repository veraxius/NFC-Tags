import { ok, fail, handler } from "@/lib/api";
import { requireUser, actorTypeFor } from "@/lib/auth";
import { replaceDevice, DeviceError } from "@/lib/devices";

// TRS 29 — POST /devices/{id}/replace
export const POST = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  try {
    const { replacement, token } = await replaceDevice({
      idOrPublicId: id,
      session,
      actorType: actorTypeFor(session),
      reason: "replaced_via_api",
    });
    return ok(
      {
        replacement_device_id: replacement.publicDeviceId,
        status: replacement.status,
        // Shown once only — the platform stores just the hash, so this value
        // must be written to the physical NFC chip now or regenerated later.
        nfc_token: token,
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof DeviceError) return fail(e.code, e.message, e.status);
    throw e;
  }
});

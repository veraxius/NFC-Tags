import { db } from "@/lib/db";
import { ok, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";

// TRS 28 — GET /users/me/devices
// Never exposes token_hash (TRS §23: the token is server-side only).
export const GET = handler(async () => {
  const session = await requireUser();
  const devices = await db.journeyPortDevice.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
  });
  return ok(
    devices.map((d) => ({
      id: d.publicDeviceId,
      device_type: d.deviceType,
      status: d.status,
      issued_at: d.issuedAt,
      activated_at: d.activatedAt,
      last_used_at: d.lastUsedAt,
      revoked_at: d.revokedAt,
    }))
  );
});

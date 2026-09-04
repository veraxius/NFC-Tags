import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";

// Automation #8 (weekly digest for Beaurity Operations) — same shared-secret
// auth pattern as monthly-finance, since this is also called by n8n on a
// schedule rather than by a signed-in user.
export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  const token = req.headers.get("x-reports-token");
  if (!token || token !== process.env.REPORTS_API_TOKEN) {
    return fail("UNAUTHENTICATED", "Missing or invalid reports token.", 401);
  }

  const [
    pendingVerifications,
    needsReview,
    openDisputes,
    suspendedDevices,
    lostOrStolenDevices,
    activeMembers,
    activePartners,
  ] = await Promise.all([
    db.verification.count({ where: { status: "pending" } }),
    db.verification.count({ where: { status: "review" } }),
    db.dispute.count({ where: { status: { in: ["open", "under_review"] } } }),
    db.journeyPortDevice.count({ where: { status: "suspended" } }),
    db.journeyPortDevice.count({ where: { status: { in: ["lost", "stolen"] } } }),
    db.user.count({ where: { platformRole: "member", status: "active" } }),
    db.partner.count({ where: { status: { in: ["approved", "active"] } } }),
  ]);

  return ok({
    weekOf: new Date().toISOString().slice(0, 10),
    pendingVerifications,
    needsReview,
    openDisputes,
    suspendedDevices,
    lostOrStolenDevices,
    activeMembers,
    activePartners,
  });
});

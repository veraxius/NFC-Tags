import { db } from "@/lib/db";
import { Kpi, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

// TRS 40 — Screen 01 OVERVIEW: immediate operational health.
export default async function OpsOverview() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    totalMembers,
    activeMembers,
    activePartners,
    activeDoings,
    tapsToday,
    participationsToday,
    verifiedToday,
    pendingVerifications,
    needsReview,
    rejected,
    disputed,
    verifiedTotal,
    verificationsTotal,
    activeDevices,
    totalDevices,
    suspendedDevices,
    aimCompleted,
    aimPending,
    aimNotCredible,
  ] = await Promise.all([
    db.user.count({ where: { platformRole: "member" } }),
    db.user.count({ where: { platformRole: "member", status: "active" } }),
    db.partner.count({ where: { status: { in: ["approved", "active"] } } }),
    db.earthyDoing.count({ where: { status: { in: ["published", "active"] } } }),
    db.auditEvent.count({ where: { action: "nfc.tap_resolved", createdAt: { gte: startOfDay } } }),
    db.participation.count({ where: { createdAt: { gte: startOfDay } } }),
    db.journeyMilestone.count({ where: { status: "verified", verifiedAt: { gte: startOfDay } } }),
    db.verification.count({ where: { status: "pending" } }),
    db.verification.count({ where: { status: "review" } }),
    db.verification.count({ where: { status: "rejected" } }),
    db.verification.count({ where: { status: "disputed" } }),
    db.verification.count({ where: { status: "verified" } }),
    db.verification.count(),
    db.journeyPortDevice.count({ where: { status: "active" } }),
    db.journeyPortDevice.count(),
    db.journeyPortDevice.count({ where: { status: "suspended" } }),
    db.aimAssessment.count({ where: { status: "completed" } }),
    db.aimAssessment.count({ where: { status: "pending" } }),
    db.aimAssessment.count({ where: { assessmentResult: { in: ["not_credible", "inconclusive"] } } }),
  ]);

  const completionPct = verificationsTotal > 0 ? Math.round((verifiedTotal / verificationsTotal) * 100) : 0;
  const activationPct = totalDevices > 0 ? Math.round((activeDevices / totalDevices) * 100) : 0;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Operations Overview</h1>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">JourneyPort Network</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Kpi label="Total members" value={totalMembers} />
          <Kpi label="Active members" value={activeMembers} />
          <Kpi label="Active partners" value={activePartners} />
          <Kpi label="Active Earthy Doings" value={activeDoings} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Today</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Kpi label="NFC taps" value={tapsToday} />
          <Kpi label="Participations" value={participationsToday} />
          <Kpi label="Verified milestones" value={verifiedToday} accent />
          <Kpi label="Pending verifications" value={pendingVerifications} />
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        <Card title="Verification health">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Completion</dt><dd className="font-semibold">{completionPct}%</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Needs review</dt><dd className="font-semibold text-amber-700">{needsReview}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Rejected</dt><dd className="font-semibold text-red-700">{rejected}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Disputed</dt><dd className="font-semibold text-purple-700">{disputed}</dd></div>
          </dl>
        </Card>
        <Card title="NFC health">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Active devices</dt><dd className="font-semibold">{activeDevices}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Activation</dt><dd className="font-semibold">{activationPct}%</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Suspended</dt><dd className="font-semibold text-amber-700">{suspendedDevices}</dd></div>
          </dl>
        </Card>
        <Card title="AIM">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Assessments</dt><dd className="font-semibold">{aimCompleted + aimPending}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Pending</dt><dd className="font-semibold">{aimPending}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Completed</dt><dd className="font-semibold">{aimCompleted}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Exceptions</dt><dd className="font-semibold text-amber-700">{aimNotCredible}</dd></div>
          </dl>
        </Card>
      </div>
    </div>
  );
}

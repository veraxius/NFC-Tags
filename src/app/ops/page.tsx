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
      <h1 className="text-2xl font-bold text-[var(--color-text)]">Operations Overview</h1>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">JourneyPort Network</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Kpi label="Total members" value={totalMembers} />
          <Kpi label="Active members" value={activeMembers} />
          <Kpi label="Active partners" value={activePartners} />
          <Kpi label="Active Earthy Doings" value={activeDoings} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Today</h2>
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
            <div className="flex justify-between"><dt className="text-[var(--color-text-secondary)]">Completion</dt><dd className="font-semibold">{completionPct}%</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--color-text-secondary)]">Needs review</dt><dd className="font-semibold text-[var(--color-gold-ink)]">{needsReview}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--color-text-secondary)]">Rejected</dt><dd className="font-semibold text-[var(--color-plum)]">{rejected}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--color-text-secondary)]">Disputed</dt><dd className="font-semibold text-[var(--color-teal-ink)]">{disputed}</dd></div>
          </dl>
        </Card>
        <Card title="NFC health">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-[var(--color-text-secondary)]">Active devices</dt><dd className="font-semibold">{activeDevices}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--color-text-secondary)]">Activation</dt><dd className="font-semibold">{activationPct}%</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--color-text-secondary)]">Suspended</dt><dd className="font-semibold text-[var(--color-gold-ink)]">{suspendedDevices}</dd></div>
          </dl>
        </Card>
        <Card title="AIM">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-[var(--color-text-secondary)]">Assessments</dt><dd className="font-semibold">{aimCompleted + aimPending}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--color-text-secondary)]">Pending</dt><dd className="font-semibold">{aimPending}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--color-text-secondary)]">Completed</dt><dd className="font-semibold">{aimCompleted}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--color-text-secondary)]">Exceptions</dt><dd className="font-semibold text-[var(--color-gold-ink)]">{aimNotCredible}</dd></div>
          </dl>
        </Card>
      </div>
    </div>
  );
}

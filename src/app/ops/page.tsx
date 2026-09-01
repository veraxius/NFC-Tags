import { db } from "@/lib/db";
import { Card } from "@/components/ui";
import { requireUser, isSuperAdmin } from "@/lib/auth";
import { ImpactRing, SegmentedBar, TrendLine, OrganicCard, Headline } from "@/components/organic";
import { dayBuckets } from "@/lib/trend";
import { IconCard, IconUsers, IconCheck, IconClock, IconLeaf, IconShield } from "@/components/icons";

export const dynamic = "force-dynamic";

// TRS 40 — Screen 01 OVERVIEW: immediate operational health, restyled to
// share the ring/segmented-bar/trend-line visual language now used on the
// Partner and Journey dashboards. Same underlying data as before, plus a
// Super Administrator–only section (role/access breakdown across the whole
// platform — beaurity_admin doesn't get this row).
export default async function OpsOverview() {
  const session = await requireUser();
  const superAdmin = isSuperAdmin(session);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const last14 = new Date();
  last14.setHours(0, 0, 0, 0);
  last14.setDate(last14.getDate() - 13);

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
    recentParticipations,
    recentDoings,
    roleCounts,
    partnerUserCounts,
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
    db.participation.findMany({ where: { createdAt: { gte: last14 } }, select: { createdAt: true } }),
    db.earthyDoing.findMany({ where: { createdAt: { gte: last14 } }, select: { createdAt: true } }),
    db.user.groupBy({ by: ["platformRole"], _count: true }),
    db.partnerUser.groupBy({ by: ["role"], _count: true }),
  ]);

  const completionPct = verificationsTotal > 0 ? Math.round((verifiedTotal / verificationsTotal) * 100) : 0;
  const activationPct = totalDevices > 0 ? Math.round((activeDevices / totalDevices) * 100) : 0;

  const activityTrend = dayBuckets(recentParticipations.map((p) => p.createdAt), 14);
  const doingsTrend = dayBuckets(recentDoings.map((d) => d.createdAt), 14);

  return (
    <div className="space-y-8">
      <div>
        <Headline className="text-2xl font-semibold">Operations Overview</Headline>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Signed in as <span className="font-medium">{session.platformRole.replace(/_/g, " ")}</span>
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <OrganicCard className="p-5">
          <ImpactRing pct={completionPct} value={`${completionPct}%`} label="Verification completion" color="var(--color-mint)" />
        </OrganicCard>
        <OrganicCard className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Total members</p>
          <p className="mt-1 text-3xl font-semibold text-[var(--color-text)]">{totalMembers}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">{activeMembers} active</p>
          <div className="mt-2">
            <TrendLine points={doingsTrend} color="var(--color-peach)" height={48} sparkline />
          </div>
        </OrganicCard>
        <OrganicCard className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Active Earthy Doings</p>
          <p className="mt-1 text-3xl font-semibold text-[var(--color-text)]">{activeDoings}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">{activePartners} active partners</p>
          <div className="mt-2">
            <TrendLine points={activityTrend} color="var(--color-mint)" height={48} sparkline />
          </div>
        </OrganicCard>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <OrganicCard className="p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Verification breakdown</h3>
          <SegmentedBar
            segments={[
              { label: "Verified", value: verifiedTotal, color: "var(--color-mint)" },
              { label: "Needs review", value: needsReview, color: "var(--color-gold)" },
              { label: "Rejected", value: rejected, color: "var(--color-plum)" },
              { label: "Disputed", value: disputed, color: "var(--color-teal)" },
            ]}
          />
        </OrganicCard>
        <OrganicCard className="p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Platform activity (14 days)</h3>
          <TrendLine points={activityTrend} color="var(--color-pink)" height={120} />
        </OrganicCard>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Today at a glance</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { icon: <IconCard />, label: "NFC taps", value: tapsToday },
            { icon: <IconUsers />, label: "Participations", value: participationsToday },
            { icon: <IconCheck />, label: "Verified milestones", value: verifiedToday, accent: true },
            { icon: <IconClock />, label: "Pending verifications", value: pendingVerifications },
          ].map((s) => (
            <OrganicCard key={s.label} className="flex items-center gap-3 p-4">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  s.accent ? "bg-[var(--color-mint-soft)] text-[var(--color-mint-ink)]" : "bg-[var(--color-bg-alt)] text-[var(--color-text-secondary)]"
                }`}
              >
                {s.icon}
              </span>
              <div>
                <p className="text-xl font-semibold text-[var(--color-text)]">{s.value}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{s.label}</p>
              </div>
            </OrganicCard>
          ))}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <OrganicCard className="p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">JourneyPort network</h3>
          <ImpactRing pct={activationPct} value={`${activationPct}%`} label="Devices activated" color="var(--color-peach)" />
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-[var(--color-text-secondary)]">Active devices</dt><dd className="font-semibold">{activeDevices}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--color-text-secondary)]">Suspended</dt><dd className="font-semibold text-[var(--color-gold-ink)]">{suspendedDevices}</dd></div>
          </dl>
        </OrganicCard>
        <Card title="AIM Trust Layer">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-[var(--color-text-secondary)]">Assessments</dt><dd className="font-semibold">{aimCompleted + aimPending}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--color-text-secondary)]">Pending</dt><dd className="font-semibold">{aimPending}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--color-text-secondary)]">Completed</dt><dd className="font-semibold">{aimCompleted}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--color-text-secondary)]">Exceptions</dt><dd className="font-semibold text-[var(--color-gold-ink)]">{aimNotCredible}</dd></div>
          </dl>
        </Card>
      </div>

      {superAdmin && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            <IconShield className="h-4 w-4" />
            Platform roles &amp; access — Super Administrator only
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <OrganicCard className="p-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Platform roles</h3>
              <ul className="space-y-2 text-sm">
                {roleCounts.map((r) => (
                  <li key={r.platformRole} className="flex justify-between border-b border-black/[0.05] py-1">
                    <span className="font-mono text-xs">{r.platformRole}</span>
                    <span className="text-[var(--color-text-secondary)]">{r._count} users</span>
                  </li>
                ))}
              </ul>
            </OrganicCard>
            <OrganicCard className="p-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Partner-side roles</h3>
              <ul className="space-y-2 text-sm">
                {partnerUserCounts.map((r) => (
                  <li key={r.role} className="flex justify-between border-b border-black/[0.05] py-1">
                    <span className="font-mono text-xs">partner_{r.role}</span>
                    <span className="text-[var(--color-text-secondary)]">{r._count} assignments</span>
                  </li>
                ))}
              </ul>
            </OrganicCard>
          </div>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            <IconLeaf className="mr-1 inline h-3 w-3" />
            Full policy and configuration controls live on the System page.
          </p>
        </section>
      )}
    </div>
  );
}

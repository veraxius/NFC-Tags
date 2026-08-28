import { db } from "@/lib/db";
import { Card, Table, Kpi, DIMENSION_LABELS } from "@/components/ui";

export const dynamic = "force-dynamic";

// TRS 39 — REPORTS (administrative reporting, TRS §2.1 item 24).
// Reporting distinguishes recorded / pending / verified and defaults to
// aggregated figures — individual identity is not needed for enterprise or
// municipal reporting (Architecture doc §20).

const DIMENSIONS = ["SELF_SUSTAINABILITY", "EMOTIONAL_PROSPERITY", "ENVIRONMENTAL_EQUITY"];

export default async function OpsReports({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period = "30" } = await searchParams;
  const days = Number(period) || 30;
  const since = new Date(Date.now() - days * 864e5);

  const [
    newMembers,
    participationsRecorded,
    verifiedMilestones,
    pendingVerifications,
    rejectedVerifications,
    disputesOpened,
    activePartners,
    devicesActivated,
    byDimension,
    partnerRows,
  ] = await Promise.all([
    db.user.count({ where: { platformRole: "member", createdAt: { gte: since } } }),
    db.participation.count({ where: { createdAt: { gte: since } } }),
    db.journeyMilestone.count({ where: { status: "verified", verifiedAt: { gte: since } } }),
    db.verification.count({ where: { status: { in: ["pending", "review"] } } }),
    db.verification.count({ where: { status: "rejected", updatedAt: { gte: since } } }),
    db.dispute.count({ where: { createdAt: { gte: since } } }),
    db.partner.count({ where: { status: { in: ["approved", "active"] } } }),
    db.journeyPortDevice.count({ where: { activatedAt: { gte: since } } }),
    Promise.all(
      DIMENSIONS.map(async (dimension) => ({
        dimension,
        verified: await db.journeyMilestone.count({
          where: {
            status: "verified",
            verifiedAt: { gte: since },
            earthyDoing: { classifications: { some: { dimension } } },
          },
        }),
        recorded: await db.participation.count({
          where: {
            createdAt: { gte: since },
            earthyDoing: { classifications: { some: { dimension } } },
          },
        }),
      }))
    ),
    db.partner.findMany({
      where: { status: { in: ["approved", "active"] } },
      include: {
        _count: {
          select: {
            earthyDoings: true,
            participations: true,
            verifications: { where: { status: "verified" } },
          },
        },
        verifications: { select: { id: true, status: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Reports</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Aggregated platform reporting for the last {days} days.
          </p>
        </div>
        <form method="get">
          <select
            name="period"
            defaultValue={period}
            className="rounded-[10px] border border-black/10 bg-white/70 px-3 py-1.5 text-[13px]"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last 12 months</option>
          </select>
          <button className="btn-primary ml-2 !px-4 !py-1.5 !text-[13px]">Apply</button>
        </form>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Period summary
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Kpi label="New members" value={newMembers} />
          <Kpi label="Participations recorded" value={participationsRecorded} />
          <Kpi label="Milestones verified" value={verifiedMilestones} accent />
          <Kpi label="JourneyPorts activated" value={devicesActivated} />
          <Kpi label="Pending verifications" value={pendingVerifications} />
          <Kpi label="Rejected verifications" value={rejectedVerifications} />
          <Kpi label="Disputes opened" value={disputesOpened} />
          <Kpi label="Active partners" value={activePartners} />
        </div>
      </section>

      <Card title="TriSilience impact — recorded vs verified">
        <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
          Recorded participation is not presented as verified impact (TRS §48).
        </p>
        <Table headers={["Dimension", "Recorded", "Verified", "Verification rate"]}>
          {byDimension.map((d) => (
            <tr key={d.dimension}>
              <td className="px-4 py-2.5 font-medium">{DIMENSION_LABELS[d.dimension]}</td>
              <td className="px-4 py-2.5">{d.recorded}</td>
              <td className="px-4 py-2.5 font-semibold text-[var(--color-pink)]">{d.verified}</td>
              <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                {d.recorded > 0 ? `${Math.round((d.verified / d.recorded) * 100)}%` : "—"}
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card title="Partner performance">
        <Table
          headers={["Partner", "Earthy Doings", "Participations", "Verified", "Verification %"]}
        >
          {partnerRows.map((p) => {
            const total = p.verifications.length;
            const verified = p._count.verifications;
            return (
              <tr key={p.id}>
                <td className="px-4 py-2.5 font-medium">{p.name}</td>
                <td className="px-4 py-2.5">{p._count.earthyDoings}</td>
                <td className="px-4 py-2.5">{p._count.participations}</td>
                <td className="px-4 py-2.5">{verified}</td>
                <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                  {total > 0 ? `${Math.round((verified / total) * 100)}%` : "—"}
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </div>
  );
}

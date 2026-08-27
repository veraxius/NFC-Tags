import { db } from "@/lib/db";
import { Kpi, Card, DIMENSION_LABELS } from "@/components/ui";

export const dynamic = "force-dynamic";

// TRS 48 — Screen 09 IMPACT: verified aggregate impact only.
// Unverified claims are never presented as verified impact.
export default async function OpsImpact() {
  const dims = ["SELF_SUSTAINABILITY", "EMOTIONAL_PROSPERITY", "ENVIRONMENTAL_EQUITY"];

  const [verifiedMilestones, recordedParticipations, pendingVerifications, participants, partners, repeat] =
    await Promise.all([
      db.journeyMilestone.count({ where: { status: "verified" } }),
      db.participation.count(),
      db.verification.count({ where: { status: { in: ["pending", "review"] } } }),
      db.participation.groupBy({ by: ["userId"] }).then((g) => g.length),
      db.partner.count({ where: { status: { in: ["approved", "active"] } } }),
      db.participation
        .groupBy({ by: ["userId"], _count: true })
        .then((g) => g.filter((x) => x._count > 1).length),
    ]);

  const byDimension = await Promise.all(
    dims.map(async (d) => ({
      dimension: d,
      verified: await db.journeyMilestone.count({
        where: { status: "verified", earthyDoing: { classifications: { some: { dimension: d } } } },
      }),
    }))
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Impact</h1>
        <p className="mt-1 text-sm text-slate-500">
          Verified participation, distinguished from recorded and pending claims.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Kpi label="Verified Earthy Doings" value={verifiedMilestones} accent />
        <Kpi label="Recorded participations" value={recordedParticipations} />
        <Kpi label="Pending verification" value={pendingVerifications} />
        <Kpi label="Active participants" value={participants} />
        <Kpi label="Active partners" value={partners} />
        <Kpi label="Repeat participation" value={repeat} />
      </div>

      <Card title="Verified impact by TriSilience dimension">
        <div className="grid gap-4 md:grid-cols-3">
          {byDimension.map((d) => (
            <div key={d.dimension} className="rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-3xl font-bold text-emerald-700">{d.verified}</p>
              <p className="mt-1 text-sm font-medium text-slate-600">{DIMENSION_LABELS[d.dimension]}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { resolvePartnerFor } from "@/lib/partner";
import { Kpi, Card } from "@/components/ui";
import { DIMENSION_LABELS } from "@/lib/dimensions";
import { pctChange } from "@/lib/metrics";
import { OrganicCard, Headline, PieChart, type PieSlice } from "@/components/organic";

export const dynamic = "force-dynamic";

const DIMENSIONS = ["SELF_SUSTAINABILITY", "EMOTIONAL_PROSPERITY", "ENVIRONMENTAL_EQUITY"];

export default async function PartnerOverview({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await requireUser();
  const partner = await resolvePartnerFor(user);
  const { period = "30" } = await searchParams;
  const days = Number(period) || 30;
  const since = new Date(Date.now() - days * 864e5);
  const previousSince = new Date(Date.now() - days * 2 * 864e5);

  const [
    doingsNow,
    doingsPrev,
    participationsNow,
    participationsPrev,
    verifiedNow,
    verifiedPrev,
    peopleNow,
    peoplePrev,
    pendingVerifications,
    allTimeVerified,
    allTimeRejected,
    allTimePeopleGroups,
    allTimeParticipations,
    doingsWithCounts,
    verifiedWithTimes,
  ] = await Promise.all([
    db.earthyDoing.count({ where: { partnerId: partner.id, createdAt: { gte: since } } }),
    db.earthyDoing.count({ where: { partnerId: partner.id, createdAt: { gte: previousSince, lt: since } } }),
    db.participation.count({ where: { partnerId: partner.id, checkInAt: { gte: since } } }),
    db.participation.count({ where: { partnerId: partner.id, checkInAt: { gte: previousSince, lt: since } } }),
    db.verification.count({ where: { partnerId: partner.id, status: "verified", verifiedAt: { gte: since } } }),
    db.verification.count({
      where: { partnerId: partner.id, status: "verified", verifiedAt: { gte: previousSince, lt: since } },
    }),
    db.participation.groupBy({ by: ["userId"], where: { partnerId: partner.id, checkInAt: { gte: since } }, _count: true }),
    db.participation.groupBy({
      by: ["userId"],
      where: { partnerId: partner.id, checkInAt: { gte: previousSince, lt: since } },
      _count: true,
    }),
    db.verification.count({ where: { partnerId: partner.id, status: { in: ["pending", "review"] } } }),
    db.verification.count({ where: { partnerId: partner.id, status: "verified" } }),
    db.verification.count({ where: { partnerId: partner.id, status: { in: ["rejected", "disputed", "revoked"] } } }),
    db.participation.groupBy({ by: ["userId"], where: { partnerId: partner.id }, _count: true }),
    db.participation.count({ where: { partnerId: partner.id } }),
    db.earthyDoing.findMany({
      where: { partnerId: partner.id },
      select: { id: true, title: true, _count: { select: { participations: true } } },
      orderBy: { participations: { _count: "desc" } },
    }),
    db.verification.findMany({
      where: { partnerId: partner.id, status: "verified", verifiedAt: { not: null } },
      select: { verifiedAt: true, participation: { select: { checkInAt: true } } },
    }),
  ]);

  const awaitingCompletion = await db.participation.findMany({
    where: { partnerId: partner.id, status: { in: ["detected", "in_progress"] } },
    include: { user: true, earthyDoing: true },
    orderBy: { checkInAt: "desc" },
    take: 10,
  });

  const byDimension = await Promise.all(
    DIMENSIONS.map(async (d) => ({
      dimension: d,
      participations: await db.participation.count({
        where: { partnerId: partner.id, earthyDoing: { classifications: { some: { dimension: d } } } },
      }),
      verified: await db.journeyMilestone.count({
        where: {
          status: "verified",
          earthyDoing: { partnerId: partner.id, classifications: { some: { dimension: d } } },
        },
      }),
    }))
  );

  const topPeopleIds = allTimePeopleGroups
    .slice()
    .sort((a, b) => b._count - a._count)
    .slice(0, 5)
    .map((g) => g.userId);
  const topPeopleUsers = await db.user.findMany({
    where: { id: { in: topPeopleIds } },
    include: { journeyIdentity: true },
  });
  const topPeople = topPeopleIds
    .map((id) => {
      const u = topPeopleUsers.find((x) => x.id === id);
      const count = allTimePeopleGroups.find((g) => g.userId === id)?._count ?? 0;
      return u ? { id, name: u.displayName ?? `${u.firstName} ${u.lastName}`, count } : null;
    })
    .filter((x): x is { id: string; name: string; count: number } => x !== null);

  // ---- Performance KPIs (all-time — org health, not a period flow) ----
  const repeatPeople = allTimePeopleGroups.filter((g) => g._count > 1).length;
  const retentionRate = allTimePeopleGroups.length > 0 ? (repeatPeople / allTimePeopleGroups.length) * 100 : null;
  const avgParticipationsPerPerson =
    allTimePeopleGroups.length > 0 ? allTimeParticipations / allTimePeopleGroups.length : null;
  const verificationOutcomes = allTimeVerified + pendingVerifications + allTimeRejected;
  const verificationRate = verificationOutcomes > 0 ? (allTimeVerified / verificationOutcomes) * 100 : null;
  const avgConfirmHours =
    verifiedWithTimes.length > 0
      ? verifiedWithTimes.reduce(
          (s, v) => s + (v.verifiedAt!.getTime() - v.participation.checkInAt.getTime()) / 36e5,
          0
        ) / verifiedWithTimes.length
      : null;

  const DOING_COLORS = [
    "var(--color-pink)",
    "var(--color-gold)",
    "var(--color-plum)",
    "var(--color-teal)",
    "var(--color-mint)",
    "var(--color-peach)",
  ];
  const sortedDoings = doingsWithCounts.filter((d) => d._count.participations > 0);
  const topDoings = sortedDoings.slice(0, 6);
  const otherDoingsTotal = sortedDoings.slice(6).reduce((s, d) => s + d._count.participations, 0);
  const doingSlices: PieSlice[] = [
    ...topDoings.map((d, i) => ({
      label: d.title,
      value: d._count.participations,
      color: DOING_COLORS[i % DOING_COLORS.length],
    })),
    ...(otherDoingsTotal > 0 ? [{ label: "Other", value: otherDoingsTotal, color: "var(--color-warmgray)" }] : []),
  ];

  const performanceSlices: PieSlice[] = [
    { label: "Verified", value: allTimeVerified, color: "var(--color-mint)" },
    { label: "Pending review", value: pendingVerifications, color: "var(--color-gold)" },
    { label: "Rejected / disputed", value: allTimeRejected, color: "var(--color-plum)" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Headline className="text-3xl">{partner.name}</Headline>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Your impact, tracked and verified.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <form method="get" className="flex flex-wrap items-center gap-2">
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
            <button className="btn-primary !px-4 !py-1.5 !text-[13px]">Apply</button>
          </form>
          <Link
            href="/partner/doings/new"
            className="rounded-full bg-[var(--color-pink)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-pink-hover)]"
          >
            + New Earthy Doing
          </Link>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          This period, vs. the {days} days before it
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Kpi label="New activities" value={doingsNow} deltaPct={pctChange(doingsNow, doingsPrev)} />
          <Kpi label="People active" value={peopleNow.length} deltaPct={pctChange(peopleNow.length, peoplePrev.length)} />
          <Kpi
            label="Check-ins"
            value={participationsNow}
            deltaPct={pctChange(participationsNow, participationsPrev)}
          />
          <Kpi label="Verified" value={verifiedNow} accent deltaPct={pctChange(verifiedNow, verifiedPrev)} />
          <Kpi label="Waiting on you" value={pendingVerifications} />
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Key performance indicators (all-time)
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Kpi label="Volunteer retention" value={retentionRate != null ? `${retentionRate.toFixed(0)}%` : "—"} />
          <Kpi
            label="Avg. check-ins / person"
            value={avgParticipationsPerPerson != null ? avgParticipationsPerPerson.toFixed(1) : "—"}
          />
          <Kpi label="Verification rate" value={verificationRate != null ? `${verificationRate.toFixed(0)}%` : "—"} accent />
          <Kpi
            label="Avg. time to confirm"
            value={
              avgConfirmHours != null
                ? avgConfirmHours < 24
                  ? `${avgConfirmHours.toFixed(1)}h`
                  : `${(avgConfirmHours / 24).toFixed(1)}d`
                : "—"
            }
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Impact by dimension">
          <div className="space-y-3">
            {byDimension.map((d) => (
              <div key={d.dimension} className="flex items-center justify-between text-sm">
                <span className="font-medium text-[var(--color-text)]">{DIMENSION_LABELS[d.dimension]}</span>
                <span className="text-[var(--color-text-secondary)]">
                  <span className="font-semibold text-[var(--color-mint-ink)]">{d.verified}</span> verified ·{" "}
                  {d.participations} recorded
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Most active people">
          {topPeople.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">No one yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-divider)] text-sm">
              {topPeople.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2">
                  <Link href={`/partner/people/${p.id}`} className="font-medium text-[var(--color-pink)] hover:underline">
                    {p.name}
                  </Link>
                  <span className="text-[var(--color-text-secondary)]">{p.count} check-ins</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/partner/people" className="mt-3 block text-xs font-semibold text-[var(--color-pink)] hover:underline">
            See everyone →
          </Link>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Participation by Earthy Doing">
          <PieChart data={doingSlices} />
        </Card>
        <Card title="Overall performance">
          <PieChart data={performanceSlices} />
        </Card>
      </div>

      <OrganicCard className="p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          People here right now
        </h2>
        {awaitingCompletion.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">Nobody's checked in at the moment.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-divider)] text-sm">
            {awaitingCompletion.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <span className="font-medium">{p.user.displayName}</span>
                  <span className="ml-2 text-[var(--color-text-secondary)]">· {p.earthyDoing.title}</span>
                </div>
                <Link href="/partner/verifications" className="text-xs font-semibold text-[var(--color-pink)] hover:underline">
                  Confirm →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </OrganicCard>
    </div>
  );
}

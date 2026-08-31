import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { resolvePartnerFor } from "@/lib/partner";
import { Kpi, Card } from "@/components/ui";
import { DIMENSION_LABELS } from "@/lib/dimensions";
import { pctChange } from "@/lib/metrics";
import { monthBuckets } from "@/lib/trend";
import {
  OrganicCard,
  Headline,
  ImpactRing,
  SegmentedBar,
  TrendLine,
  type BarSegment,
} from "@/components/organic";
import { IconGlobe, IconUsers, IconBook, IconHeart, IconGeneral } from "@/components/icons";
import type { ComponentType } from "react";

export const dynamic = "force-dynamic";

const DIMENSIONS = ["SELF_SUSTAINABILITY", "EMOTIONAL_PROSPERITY", "ENVIRONMENTAL_EQUITY"];
const DIMENSION_COLORS: Record<string, string> = {
  SELF_SUSTAINABILITY: "var(--color-pink)",
  EMOTIONAL_PROSPERITY: "var(--color-peach)",
  ENVIRONMENTAL_EQUITY: "var(--color-mint)",
};
const CATEGORY_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  environmental: IconGlobe,
  community: IconUsers,
  education: IconBook,
  health: IconHeart,
  general: IconGeneral,
};
const CATEGORY_LABELS: Record<string, string> = {
  environmental: "Environmental",
  community: "Community",
  education: "Education",
  health: "Health",
  general: "General",
};

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
  const sixMonthsAgo = new Date(Date.now() - 182 * 864e5);

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
    doingsCreatedDates,
    doingsByCategory,
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
    db.earthyDoing.findMany({
      where: { partnerId: partner.id, createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    }),
    db.earthyDoing.groupBy({ by: ["category"], where: { partnerId: partner.id }, _count: true }),
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

  const doingsTrend = monthBuckets(doingsCreatedDates.map((d) => d.createdAt));
  const verifiedTrend = monthBuckets(verifiedWithTimes.map((v) => v.verifiedAt!));

  const impactSegments: BarSegment[] = byDimension.map((d) => ({
    label: DIMENSION_LABELS[d.dimension],
    value: d.verified,
    color: DIMENSION_COLORS[d.dimension],
  }));

  const rankedDimensions = byDimension
    .slice()
    .sort((a, b) => b.verified - a.verified);
  const maxDimensionVerified = Math.max(1, ...rankedDimensions.map((d) => d.verified));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Welcome back, {user.displayName.split(" ")[0]}!
          </p>
          <Headline className="text-3xl">{partner.name}</Headline>
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Verification rate">
          <ImpactRing
            pct={verificationRate ?? 0}
            value={verificationRate != null ? `${verificationRate.toFixed(0)}%` : "—"}
            label="Excellent Impact"
            color="var(--color-mint)"
          />
        </Card>
        <Card title="Total Earthy Doings">
          <p className="text-3xl font-semibold text-[var(--color-text)]">{doingsWithCounts.length}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">This month: {doingsNow}</p>
          <div className="-mb-2 mt-2">
            <TrendLine points={doingsTrend} color="var(--color-pink)" height={64} sparkline />
          </div>
        </Card>
        <Card title="Your people">
          <p className="text-3xl font-semibold text-[var(--color-text)]">{allTimePeopleGroups.length}</p>
          <p className="mt-1 text-xs">
            {(() => {
              const d = pctChange(peopleNow.length, peoplePrev.length);
              if (d == null) return <span className="text-[var(--color-text-secondary)]">No change yet</span>;
              return (
                <span className={d >= 0 ? "text-[var(--color-mint-ink)]" : "text-[var(--color-plum)]"}>
                  {d >= 0 ? "↑" : "↓"} {Math.abs(Math.round(d))}% this period
                </span>
              );
            })()}
          </p>
          <Link href="/partner/people" className="mt-3 inline-block text-xs font-semibold text-[var(--color-pink)] hover:underline">
            See everyone →
          </Link>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Your Impact Distribution">
          <SegmentedBar segments={impactSegments} />
        </Card>
        <Card title="Impact Over Time — verified milestones">
          <TrendLine points={verifiedTrend} color="var(--color-pink)" height={140} />
        </Card>
      </div>

      <Card title="Your Earthy Doing Activity — by category">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {doingsByCategory.map((c) => {
            const Icon = CATEGORY_ICONS[c.category] ?? IconGeneral;
            return (
              <div key={c.category} className="rounded-2xl border border-[var(--color-divider)] p-4 text-center">
                <Icon className="mx-auto text-[var(--color-pink)]" />
                <p className="mt-2 text-xl font-semibold text-[var(--color-text)]">{c._count}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {CATEGORY_LABELS[c.category] ?? c.category}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card title="Top Impacted Areas">
          <div className="space-y-3">
            {rankedDimensions.map((d) => (
              <div key={d.dimension}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--color-text)]">{DIMENSION_LABELS[d.dimension]}</span>
                  <span className="text-[var(--color-text-secondary)]">{d.verified} pts</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-alt)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(d.verified / maxDimensionVerified) * 100}%`,
                      background: DIMENSION_COLORS[d.dimension],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Most active people">
          {topPeople.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">No one yet.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {topPeople.map((p) => (
                <Link key={p.id} href={`/partner/people/${p.id}`} className="text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-pink-soft)] text-sm font-semibold text-[var(--color-pink-ink)]">
                    {p.name.slice(0, 1)}
                  </div>
                  <p className="mt-1 max-w-[64px] truncate text-[11px] text-[var(--color-text-secondary)]">
                    {p.name.split(" ")[0]}
                  </p>
                </Link>
              ))}
            </div>
          )}
          <Link href="/partner/people" className="mt-4 block text-xs font-semibold text-[var(--color-pink)] hover:underline">
            See everyone →
          </Link>
        </Card>

        <Card title="Key performance indicators">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-secondary)]">Volunteer retention</span>
              <span className="font-semibold text-[var(--color-text)]">
                {retentionRate != null ? `${retentionRate.toFixed(0)}%` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-secondary)]">Avg. check-ins / person</span>
              <span className="font-semibold text-[var(--color-text)]">
                {avgParticipationsPerPerson != null ? avgParticipationsPerPerson.toFixed(1) : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-secondary)]">Avg. time to confirm</span>
              <span className="font-semibold text-[var(--color-text)]">
                {avgConfirmHours != null
                  ? avgConfirmHours < 24
                    ? `${avgConfirmHours.toFixed(1)}h`
                    : `${(avgConfirmHours / 24).toFixed(1)}d`
                  : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-secondary)]">Waiting on you</span>
              <span className="font-semibold text-[var(--color-text)]">{pendingVerifications}</span>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          This period, vs. the {days} days before it
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Kpi label="New activities" value={doingsNow} deltaPct={pctChange(doingsNow, doingsPrev)} />
          <Kpi label="People active" value={peopleNow.length} deltaPct={pctChange(peopleNow.length, peoplePrev.length)} />
          <Kpi
            label="Check-ins"
            value={participationsNow}
            deltaPct={pctChange(participationsNow, participationsPrev)}
          />
          <Kpi label="Verified" value={verifiedNow} accent deltaPct={pctChange(verifiedNow, verifiedPrev)} />
        </div>
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

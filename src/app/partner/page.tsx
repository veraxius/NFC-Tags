import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { resolvePartnerFor } from "@/lib/partner";
import { Kpi, Card } from "@/components/ui";
import { DIMENSION_LABELS } from "@/lib/dimensions";
import { OrganicCard, Headline } from "@/components/organic";

export const dynamic = "force-dynamic";

const DIMENSIONS = ["SELF_SUSTAINABILITY", "EMOTIONAL_PROSPERITY", "ENVIRONMENTAL_EQUITY"];

export default async function PartnerOverview() {
  const user = await requireUser();
  const partner = await resolvePartnerFor(user);

  const [doings, participations, pendingVerifications, verifiedCount, peopleGroups] = await Promise.all([
    db.earthyDoing.count({ where: { partnerId: partner.id } }),
    db.participation.count({ where: { partnerId: partner.id } }),
    db.verification.count({ where: { partnerId: partner.id, status: { in: ["pending", "review"] } } }),
    db.verification.count({ where: { partnerId: partner.id, status: "verified" } }),
    db.participation.groupBy({ by: ["userId"], where: { partnerId: partner.id }, _count: true }),
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

  const topPeopleIds = peopleGroups
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
      const count = peopleGroups.find((g) => g.userId === id)?._count ?? 0;
      return u ? { id, name: u.displayName ?? `${u.firstName} ${u.lastName}`, count } : null;
    })
    .filter((x): x is { id: string; name: string; count: number } => x !== null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Headline className="text-3xl">{partner.name}</Headline>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Your impact, tracked and verified.
          </p>
        </div>
        <Link
          href="/partner/doings/new"
          className="rounded-full bg-[var(--color-pink)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-pink-hover)]"
        >
          + New Earthy Doing
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Kpi label="Activities" value={doings} />
        <Link href="/partner/people">
          <Kpi label="Your people" value={peopleGroups.length} />
        </Link>
        <Kpi label="Total check-ins" value={participations} />
        <Kpi label="Waiting on you" value={pendingVerifications} />
        <Kpi label="Verified" value={verifiedCount} accent />
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

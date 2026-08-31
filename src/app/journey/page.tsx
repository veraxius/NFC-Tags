import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { DimensionBadge, Card } from "@/components/ui";
import { OrganicCard, StatusPill, Headline, SegmentedBar, type BarSegment } from "@/components/organic";
import { DIMENSION_LABELS } from "@/lib/dimensions";

const DIMENSION_COLORS: Record<string, string> = {
  SELF_SUSTAINABILITY: "var(--color-pink)",
  EMOTIONAL_PROSPERITY: "var(--color-peach)",
  ENVIRONMENTAL_EQUITY: "var(--color-mint)",
};

// TRS 50 — Member Journey screen: simple timeline with VIEW VERIFICATION.
export const dynamic = "force-dynamic";

export default async function JourneyTimeline() {
  const user = await requireUser();
  const [milestones, pending] = await Promise.all([
    db.journeyMilestone.findMany({
      where: { userId: user.id },
      orderBy: { earnedAt: "desc" },
      include: {
        earthyDoing: { include: { partner: true, classifications: true } },
      },
    }),
    db.participation.findMany({
      where: { userId: user.id, status: { in: ["detected", "in_progress", "verification_pending"] } },
      include: { earthyDoing: { include: { partner: true, classifications: true } } },
      orderBy: { checkInAt: "desc" },
    }),
  ]);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const verified = milestones.filter((m) => m.status === "verified");
  const dimensions = ["SELF_SUSTAINABILITY", "EMOTIONAL_PROSPERITY", "ENVIRONMENTAL_EQUITY"];
  const impactSegments: BarSegment[] = dimensions.map((d) => ({
    label: DIMENSION_LABELS[d],
    value: verified.filter((m) => m.earthyDoing.classifications.some((c) => c.dimension === d)).length,
    color: DIMENSION_COLORS[d],
  }));
  const currentlyAt = pending[0];
  const hoursSinceCheckIn = currentlyAt
    ? (Date.now() - currentlyAt.checkInAt.getTime()) / 36e5
    : null;

  return (
    <div>
      <Headline className="text-3xl">
        {user.displayName.split(" ")[0]}&apos;s Journey
      </Headline>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Every meaningful thing you&apos;ve done, all in one place.
      </p>

      {verified.length > 0 && (
        <div className="mt-6">
          <Card title="Your Impact">
            <SegmentedBar segments={impactSegments} />
          </Card>
        </div>
      )}

      {currentlyAt && (
        <div className="mt-4">
          <OrganicCard
            accentDimension={currentlyAt.earthyDoing.classifications[0]?.dimension}
            className="p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-gold-ink)]">
              You&apos;re currently at
            </p>
            <p className="mt-1 text-lg font-semibold text-[var(--color-text)]">
              {currentlyAt.earthyDoing.title}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {currentlyAt.earthyDoing.partner.name} ·{" "}
              {hoursSinceCheckIn != null && hoursSinceCheckIn < 1
                ? "just tapped in"
                : hoursSinceCheckIn != null && hoursSinceCheckIn < 24
                  ? `tapped in ${hoursSinceCheckIn.toFixed(1)}h ago`
                  : `tapped in on ${fmt(currentlyAt.checkInAt)}`}
            </p>
          </OrganicCard>
        </div>
      )}

      {pending.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            On its way
          </h2>
          <div className="mt-3 space-y-3">
            {pending.map((p) => (
              <OrganicCard
                key={p.id}
                accentDimension={p.earthyDoing.classifications[0]?.dimension}
                className="p-4"
              >
                <p className="text-xs font-medium text-[var(--color-gold-ink)]">{fmt(p.checkInAt)}</p>
                <p className="mt-1 font-semibold text-[var(--color-text)]">{p.earthyDoing.title}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {p.earthyDoing.partner.name} is confirming this one
                </p>
                <div className="mt-2">
                  <StatusPill status={p.status} />
                </div>
              </OrganicCard>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Your milestones
        </h2>
        {milestones.length === 0 && (
          <OrganicCard className="mt-3 p-6 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Your Journey is just getting started. Tap your JourneyPort at an
              Earthy Doing to add your first milestone.
            </p>
          </OrganicCard>
        )}
        <div className="mt-3 space-y-4">
          {milestones.map((m) => (
            <OrganicCard
              key={m.id}
              accentDimension={m.earthyDoing.classifications[0]?.dimension}
              className="p-5"
            >
              <p className="text-xs font-medium text-[var(--color-warmgray-ink)]">{fmt(m.earnedAt)}</p>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-[var(--color-text)]">{m.earthyDoing.title}</h3>
                <StatusPill status={m.status} />
              </div>
              {m.status === "verified" && (
                <p className="mt-0.5 text-sm font-medium text-[var(--color-mint-ink)]">
                  ✓ Confirmed by {m.earthyDoing.partner.name}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {m.earthyDoing.classifications.map((c) => (
                  <DimensionBadge key={c.id} dimension={c.dimension} />
                ))}
              </div>
              <Link
                href={`/journey/milestones/${m.publicId}`}
                className="mt-3 inline-block rounded-full border border-[var(--color-pink)] px-3 py-1.5 text-xs font-semibold text-[var(--color-pink)] hover:bg-[var(--color-pink-soft)]"
              >
                See why this counts
              </Link>
            </OrganicCard>
          ))}
        </div>
      </section>
    </div>
  );
}

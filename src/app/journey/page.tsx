import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { DimensionBadge } from "@/components/ui";
import { OrganicCard, StatusPill, Headline } from "@/components/organic";

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

  return (
    <div>
      <Headline className="text-3xl">
        {user.displayName.split(" ")[0]}&apos;s Journey
      </Headline>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Every meaningful thing you&apos;ve done, all in one place.
      </p>

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

import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Badge, DimensionBadge } from "@/components/ui";

// TRS 50 — Member Journey screen: simple timeline with VIEW VERIFICATION.
export const dynamic = "force-dynamic";

export default async function JourneyTimeline() {
  const user = await requireUser();
  const [identity, milestones, pending] = await Promise.all([
    db.journeyIdentity.findUnique({ where: { userId: user.id } }),
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
    d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-text)]">
        {user.displayName.split(" ")[0].toUpperCase()}&apos;S JOURNEY
      </h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Journey ID: <span className="font-mono">{identity?.publicId}</span>
      </p>

      {pending.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">In progress</h2>
          <div className="mt-3 space-y-3">
            {pending.map((p) => (
              <div key={p.id} className="rounded-xl border border-dashed border-[var(--color-gold)] bg-[var(--color-gold-soft)]/50 p-4">
                <p className="text-xs font-medium text-[var(--color-gold-ink)]">{fmt(p.checkInAt)}</p>
                <p className="mt-1 font-semibold text-[var(--color-text)]">{p.earthyDoing.title}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{p.earthyDoing.partner.name}</p>
                <div className="mt-2"><Badge status={p.status} /></div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Milestones</h2>
        {milestones.length === 0 && (
          <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
            No milestones yet. Tap your JourneyPort at an Earthy Doing to begin.
          </p>
        )}
        <div className="mt-3 space-y-4">
          {milestones.map((m) => (
            <div key={m.id} className="rounded-xl border border-[var(--color-divider)] bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-[var(--color-warmgray)]">{fmt(m.earnedAt)}</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-[var(--color-text)]">{m.earthyDoing.title}</h3>
                <Badge status={m.status} />
              </div>
              {m.status === "verified" && (
                <p className="mt-0.5 text-sm font-medium text-[var(--color-pink)]">✓ VERIFIED EARTHY DOING</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {m.earthyDoing.classifications.map((c) => (
                  <DimensionBadge key={c.id} dimension={c.dimension} />
                ))}
              </div>
              <p className="mt-2 text-xs text-[var(--color-text-secondary)]">Verified by: {m.earthyDoing.partner.name}</p>
              <Link
                href={`/journey/milestones/${m.publicId}`}
                className="mt-3 inline-block rounded-lg border border-[var(--color-pink)] px-3 py-1.5 text-xs font-semibold text-[var(--color-pink)] hover:bg-[var(--color-mint-soft)]"
              >
                VIEW VERIFICATION
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

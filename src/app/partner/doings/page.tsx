import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { resolvePartnerFor } from "@/lib/partner";
import { DimensionBadge } from "@/components/ui";
import { OrganicCard, StatusPill, Headline } from "@/components/organic";

export const dynamic = "force-dynamic";

export default async function PartnerDoings() {
  const user = await requireUser();
  const partner = await resolvePartnerFor(user);
  const doings = await db.earthyDoing.findMany({
    where: { partnerId: partner.id },
    include: {
      classifications: true,
      _count: { select: { participations: true, milestones: { where: { status: "verified" } } } },
    },
    orderBy: { startAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Headline className="text-3xl">Your Earthy Doings</Headline>
        <Link
          href="/partner/doings/new"
          className="rounded-full bg-[var(--color-pink)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-pink-hover)]"
        >
          + New Earthy Doing
        </Link>
      </div>
      {doings.length === 0 ? (
        <OrganicCard className="p-6 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Nothing here yet — create your first Earthy Doing to start tracking impact.
          </p>
        </OrganicCard>
      ) : (
        <div className="space-y-3">
          {doings.map((d) => (
            <OrganicCard key={d.id} accentDimension={d.classifications[0]?.dimension} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--color-text)]">{d.title}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{d.startAt.toLocaleDateString()}</p>
                </div>
                <StatusPill status={d.status} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {d.classifications.map((c) => (
                  <DimensionBadge key={c.id} dimension={c.dimension} />
                ))}
              </div>
              <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                {d._count.participations} people showed up · {d._count.milestones} verified
              </p>
            </OrganicCard>
          ))}
        </div>
      )}
    </div>
  );
}

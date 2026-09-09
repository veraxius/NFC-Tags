import Link from "next/link";
import { OrganicCard, StatusPill } from "@/components/organic";
import { DimensionBadge } from "@/components/ui";
import type { listAllEarthyDoings } from "@/lib/earthyDoings";

// The shared "what's happening across the network" list — a search box over
// the up-to-10 most recent browsable Earthy Doings, each a full-width card
// stacked one under the other, click through to the same detail view
// regardless of whether a member, a partner admin, or Ops is looking.
export function EarthyDoingBrowseList({
  doings,
  hrefFor,
  searchAction,
  query,
}: {
  doings: Awaited<ReturnType<typeof listAllEarthyDoings>>;
  hrefFor: (id: string) => string;
  searchAction: string;
  query?: string;
}) {
  return (
    <div className="space-y-4">
      <form method="get" action={searchAction} className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search Earthy Doings by name…"
          className="w-full rounded-full border border-[var(--color-warmgray)] bg-white px-4 py-2.5 text-sm focus:border-[var(--color-pink)] focus:outline-none"
        />
        <button className="shrink-0 rounded-full bg-[var(--color-pink)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-pink-hover)]">
          Search
        </button>
        {query && (
          <Link
            href={searchAction}
            className="shrink-0 rounded-full border border-black/10 px-4 py-2.5 text-sm font-medium text-[var(--color-text)] hover:bg-black/[0.04]"
          >
            Clear
          </Link>
        )}
      </form>

      {doings.length === 0 ? (
        <OrganicCard className="p-6 text-sm text-[var(--color-text-secondary)]">
          {query ? `Nothing matching "${query}".` : "Nothing published yet — check back soon."}
        </OrganicCard>
      ) : (
        <div className="space-y-3">
          {doings.map((d) => (
            <Link key={d.id} href={hrefFor(d.id)}>
              <OrganicCard
                accentDimension={d.classifications[0]?.dimension}
                className="flex flex-wrap items-center justify-between gap-3 p-5 transition-shadow hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--color-text)]">{d.title}</p>
                    <StatusPill status={d.status} />
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    {d.partner.name} · {d.startAt.toLocaleDateString()}
                    {d.location && ` · ${d.location.name}`}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {d.classifications.map((c) => (
                      <DimensionBadge key={c.id} dimension={c.dimension} />
                    ))}
                  </div>
                </div>
                <p className="shrink-0 text-xs text-[var(--color-text-secondary)]">
                  {d._count.participations} {d._count.participations === 1 ? "person" : "people"} tapped in
                </p>
              </OrganicCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { requireUser } from "@/lib/auth";
import { listAllEarthyDoings, listEarthyDoingsForMap } from "@/lib/earthyDoings";
import { Headline, OrganicCard } from "@/components/organic";
import { EarthyDoingBrowseList } from "@/components/EarthyDoingBrowseList";
import { EarthyDoingsMap, type MappedDoing } from "@/components/EarthyDoingsMap";

export const dynamic = "force-dynamic";

// Every Earthy Doing currently happening across the whole network, not just
// the ones a member has already tapped into — a discovery screen, not a
// personal history (that's still the Timeline).
export default async function JourneyExplore({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireUser();
  const { q } = await searchParams;
  const [doings, forMap] = await Promise.all([listAllEarthyDoings(q), listEarthyDoingsForMap()]);

  const mapped: MappedDoing[] = forMap.map((d) => ({
    id: d.id,
    publicId: d.publicId,
    title: d.title,
    partnerName: d.partner.name,
    status: d.status,
    startAt: d.startAt.toISOString(),
    lat: d.location!.latitude!,
    lng: d.location!.longitude!,
  }));

  return (
    <div className="space-y-5">
      <div>
        <Headline className="text-2xl">Explore</Headline>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Everything happening across every organization right now.
        </p>
      </div>

      {mapped.length > 0 && (
        <OrganicCard className="overflow-hidden p-0">
          <EarthyDoingsMap doings={mapped} />
        </OrganicCard>
      )}

      <EarthyDoingBrowseList
        doings={doings}
        hrefFor={(id) => `/journey/explore/${id}`}
        searchAction="/journey/explore"
        query={q}
      />
    </div>
  );
}

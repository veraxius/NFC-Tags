import { requireUser } from "@/lib/auth";
import { listAllEarthyDoings, listEarthyDoingsForMap } from "@/lib/earthyDoings";
import { Headline, OrganicCard } from "@/components/organic";
import { EarthyDoingBrowseList } from "@/components/EarthyDoingBrowseList";
import { EarthyDoingsMap, type MappedDoing } from "@/components/EarthyDoingsMap";

export const dynamic = "force-dynamic";

// Cross-organization view — "Earthy Doings" in the sidebar stays scoped to
// this partner's own activities and their management actions; this is the
// read-only look at what every other organization on the network is running.
export default async function PartnerExplore({
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
          Every Earthy Doing currently live across the network, from every organization.
        </p>
      </div>

      {mapped.length > 0 && (
        <OrganicCard className="overflow-hidden p-0">
          <EarthyDoingsMap doings={mapped} />
        </OrganicCard>
      )}

      <EarthyDoingBrowseList
        doings={doings}
        hrefFor={(id) => `/partner/explore/${id}`}
        searchAction="/partner/explore"
        query={q}
      />
    </div>
  );
}

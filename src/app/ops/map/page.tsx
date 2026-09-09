import { db } from "@/lib/db";
import { OrganicCard, Headline } from "@/components/organic";
import { EarthyDoingsMap, type MappedDoing } from "@/components/EarthyDoingsMap";

export const dynamic = "force-dynamic";

// A global view of every Earthy Doing that has a location on file — one pin
// per activity, so Beaurity can see at a glance where impact is happening
// across the whole network, not just read it off a table.
export default async function OpsMap() {
  const doings = await db.earthyDoing.findMany({
    where: { location: { latitude: { not: null }, longitude: { not: null } } },
    include: { partner: true, location: true },
    orderBy: { startAt: "desc" },
  });

  const mapped: MappedDoing[] = doings
    .filter((d) => d.location?.latitude != null && d.location?.longitude != null)
    .map((d) => ({
      id: d.id,
      publicId: d.publicId,
      title: d.title,
      partnerName: d.partner.name,
      status: d.status,
      startAt: d.startAt.toISOString(),
      lat: d.location!.latitude!,
      lng: d.location!.longitude!,
    }));

  const withoutLocation = await db.earthyDoing.count({
    where: { OR: [{ locationId: null }, { location: { latitude: null } }, { location: { longitude: null } }] },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Headline as="h1" className="text-2xl">
            Global map
          </Headline>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Every Earthy Doing with a location on file, across the whole network.
          </p>
        </div>
        <div className="flex gap-2 text-[13px] text-[var(--color-text-secondary)]">
          <span>{mapped.length} on the map</span>
          {withoutLocation > 0 && <span>· {withoutLocation} without a location</span>}
        </div>
      </div>

      <OrganicCard className="overflow-hidden p-0">
        {mapped.length === 0 ? (
          <p className="p-6 text-sm text-[var(--color-text-secondary)]">
            No Earthy Doing has a location with coordinates yet.
          </p>
        ) : (
          <EarthyDoingsMap doings={mapped} />
        )}
      </OrganicCard>
    </div>
  );
}

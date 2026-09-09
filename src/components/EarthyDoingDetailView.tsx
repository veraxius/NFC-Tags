import Link from "next/link";
import { Table, Badge, Kpi, DimensionBadge } from "@/components/ui";
import { OrganicCard, StatusPill, Headline } from "@/components/organic";
import { SingleLocationMap } from "@/components/SingleLocationMap";
import { Avatar } from "@/components/Avatar";
import type { getEarthyDoingDetail } from "@/lib/earthyDoings";

const ACTIVE_STATUSES = ["detected", "in_progress", "verification_pending"];

// The one detail view behind every "click an Earthy Doing" flow — member,
// partner, and ops all render the exact same read-only information, just
// reached from their own area's layout and their own access check.
export function EarthyDoingDetailView({
  data,
}: {
  data: NonNullable<Awaited<ReturnType<typeof getEarthyDoingDetail>>>;
}) {
  const { doing, participations } = data;
  const activeCount = participations.filter((p) => ACTIVE_STATUSES.includes(p.status)).length;
  const verifiedCount = participations.filter((p) => p.verification?.status === "verified").length;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <Headline as="h1" className="text-3xl">
            {doing.title}
          </Headline>
          <StatusPill status={doing.status} />
        </div>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {doing.partner.name} · {doing.startAt.toLocaleDateString()}
          {doing.location && ` · ${doing.location.name}`}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {doing.classifications.map((c) => (
            <DimensionBadge key={c.id} dimension={c.dimension} />
          ))}
        </div>
        {doing.description && (
          <p className="mt-3 max-w-2xl text-sm text-[var(--color-text-secondary)]">{doing.description}</p>
        )}
        {doing.goal && (
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            Counts toward: <span className="font-medium text-[var(--color-pink)]">{doing.goal.title}</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Total participants" value={participations.length} />
        <Kpi label="Working on it now" value={activeCount} accent />
        <Kpi label="Verified" value={verifiedCount} />
        <Kpi label="Capacity" value={doing.capacity ?? "Unlimited"} />
      </div>

      {doing.location?.latitude != null && doing.location?.longitude != null && (
        <OrganicCard className="overflow-hidden p-0">
          <SingleLocationMap lat={doing.location.latitude} lng={doing.location.longitude} label={doing.location.name} />
        </OrganicCard>
      )}

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Who's here
        </h3>
        <Table headers={["Person", "Checked in", "Status"]}>
          {participations.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-4 text-sm text-[var(--color-text-secondary)]">
                No one has tapped in yet.
              </td>
            </tr>
          ) : (
            participations.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2.5">
                  <Link href={`/profile/${p.user.id}`} className="flex items-center gap-2 font-medium text-[var(--color-text)] hover:text-[var(--color-pink)]">
                    <Avatar src={p.user.avatarUrl} position={p.user.avatarPosition} name={p.user.displayName ?? p.user.firstName} size={24} />
                    {p.user.displayName ?? `${p.user.firstName} ${p.user.lastName}`}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                  {p.checkInAt.toLocaleString()}
                </td>
                <td className="px-4 py-2.5">
                  <Badge status={p.verification?.status ?? p.status} />
                </td>
              </tr>
            ))
          )}
        </Table>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { resolvePartnerFor } from "@/lib/partner";
import { db } from "@/lib/db";
import { Card, Table, Badge, Kpi, DimensionBadge } from "@/components/ui";
import { StatusPill, Headline } from "@/components/organic";

export const dynamic = "force-dynamic";

// Who's in this Earthy Doing — every participant, how many are currently
// active vs. finished, and a click-through to each person's (partner-scoped)
// detail page. Only reachable for a doing that belongs to this partner.
const ACTIVE_STATUSES = ["detected", "in_progress", "verification_pending"];

export default async function EarthyDoingDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const partner = await resolvePartnerFor(user);
  const { id } = await params;

  const doing = await db.earthyDoing.findFirst({
    where: { id, partnerId: partner.id },
    include: { classifications: true, location: true },
  });
  if (!doing) notFound();

  const participations = await db.participation.findMany({
    where: { earthyDoingId: doing.id },
    orderBy: { checkInAt: "desc" },
    include: { user: { include: { journeyIdentity: true } }, verification: true },
  });

  const activeCount = participations.filter((p) => ACTIVE_STATUSES.includes(p.status)).length;
  const verifiedCount = participations.filter((p) => p.verification?.status === "verified").length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/partner/doings" className="text-[13px] font-medium text-[var(--color-pink)] hover:underline">
          ‹ Earthy Doings
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Headline as="h1" className="text-3xl">{doing.title}</Headline>
          <StatusPill status={doing.status} />
        </div>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {doing.startAt.toLocaleDateString()}
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
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Total participants" value={participations.length} />
        <Kpi label="Working on it now" value={activeCount} accent />
        <Kpi label="Verified" value={verifiedCount} />
        <Kpi label="Capacity" value={doing.capacity ?? "Unlimited"} />
      </div>

      <Card title="Who's here">
        <Table headers={["Person", "Journey ID", "Checked in", "Status"]}>
          {participations.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-4 text-sm text-[var(--color-text-secondary)]">
                No one has tapped in yet.
              </td>
            </tr>
          ) : (
            participations.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-black/[0.02]">
                <td className="px-4 py-2.5">
                  <Link
                    href={`/partner/people/${p.userId}`}
                    className="font-medium text-[var(--color-pink)] hover:underline"
                  >
                    {p.user.displayName ?? `${p.user.firstName} ${p.user.lastName}`}
                  </Link>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-secondary)]">
                  {p.user.journeyIdentity?.publicId ?? "—"}
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
      </Card>
    </div>
  );
}

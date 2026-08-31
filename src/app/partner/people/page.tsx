import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { resolvePartnerFor } from "@/lib/partner";
import { db } from "@/lib/db";
import { Table } from "@/components/ui";

export const dynamic = "force-dynamic";

// Partner-scoped roster: everyone who has participated in THIS org's Earthy
// Doings, with a click-through to their (also partner-scoped) detail page.
// Deliberately not the Ops Members screen — no cross-org data, no filters
// beyond a name search, since this is a small org's own people, not the
// whole platform.
export default async function PartnerPeople({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const partner = await resolvePartnerFor(user);
  const { q = "" } = await searchParams;

  const participants = await db.user.findMany({
    where: {
      participations: { some: { partnerId: partner.id } },
      ...(q ? { displayName: { contains: q, mode: "insensitive" } } : {}),
    },
    include: {
      journeyIdentity: true,
      participations: { where: { partnerId: partner.id }, orderBy: { checkInAt: "desc" } },
      milestones: {
        where: { earthyDoing: { partnerId: partner.id }, status: "verified" },
      },
    },
    orderBy: { displayName: "asc" },
    take: 200,
  });

  const rows = participants
    .map((p) => ({
      id: p.id,
      name: p.displayName ?? `${p.firstName} ${p.lastName}`,
      journeyId: p.journeyIdentity?.publicId,
      participationCount: p.participations.length,
      verifiedCount: p.milestones.length,
      lastActivity: p.participations[0]?.checkInAt ?? null,
    }))
    .sort((a, b) => b.participationCount - a.participationCount);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">People</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Everyone who has shown up for {partner.name}.
          </p>
        </div>
        <span className="text-[13px] text-[var(--color-text-secondary)]">{rows.length} people</span>
      </div>

      <form method="get" className="glass flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Search by name</label>
          <input
            name="q"
            defaultValue={q}
            placeholder="e.g. Ana"
            className="rounded-[10px] border border-black/10 bg-white/70 px-3 py-1.5 text-[13px]"
          />
        </div>
        <button className="btn-primary !px-4 !py-1.5 !text-[13px]">Search</button>
        {q && (
          <Link href="/partner/people" className="btn-secondary !py-1.5 !text-[13px]">
            Clear
          </Link>
        )}
      </form>

      <Table headers={["Person", "Journey ID", "Participations", "Verified", "Last activity"]}>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={5} className="px-4 py-4 text-sm text-[var(--color-text-secondary)]">
              No one yet.
            </td>
          </tr>
        ) : (
          rows.map((r) => (
            <tr key={r.id} className="transition-colors hover:bg-black/[0.02]">
              <td className="px-4 py-2.5">
                <Link
                  href={`/partner/people/${r.id}`}
                  className="font-medium text-[var(--color-pink)] hover:underline"
                >
                  {r.name}
                </Link>
              </td>
              <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-secondary)]">
                {r.journeyId ?? "—"}
              </td>
              <td className="px-4 py-2.5">{r.participationCount}</td>
              <td className="px-4 py-2.5 font-semibold text-[var(--color-mint-ink)]">{r.verifiedCount}</td>
              <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                {r.lastActivity ? r.lastActivity.toLocaleDateString() : "—"}
              </td>
            </tr>
          ))
        )}
      </Table>
    </div>
  );
}

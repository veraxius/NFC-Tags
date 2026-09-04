import Link from "next/link";
import { db } from "@/lib/db";
import { Table, Badge } from "@/components/ui";
import { buildMemberWhere } from "@/lib/members";

export const dynamic = "force-dynamic";

// TRS 41 — SCREEN 02 MEMBERS
// Filters: Status | Partner | Date | JourneyPort status | Milestone activity
export default async function OpsMembers({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    partner?: string;
    since?: string;
    device?: string;
    milestones?: string;
  }>;
}) {
  const sp = await searchParams;
  const where = buildMemberWhere(sp);

  const [members, partners] = await Promise.all([
    db.user.findMany({
      where,
      include: {
        journeyIdentity: true,
        devices: { where: { status: "active" } },
        _count: { select: { milestones: { where: { status: "verified" } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.partner.findMany({ orderBy: { name: "asc" } }),
  ]);

  const filterClass =
    "rounded-[10px] border border-black/10 bg-white/70 px-3 py-1.5 text-[13px] text-[var(--color-text)]";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Members</h1>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-[var(--color-text-secondary)]">{members.length} shown</span>
          <a
            href={`/api/v1/ops/members/export?${new URLSearchParams(
              Object.entries(sp).filter(([, v]) => v) as [string, string][]
            ).toString()}`}
            className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-[var(--color-text)] transition-colors hover:bg-black/[0.04]"
          >
            Export CSV
          </a>
        </div>
      </div>

      <form method="get" className="glass flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Status</label>
          <select name="status" defaultValue={sp.status ?? ""} className={filterClass}>
            <option value="">Any</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
            <option value="deleted">Deleted</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Partner</label>
          <select name="partner" defaultValue={sp.partner ?? ""} className={filterClass}>
            <option value="">Any</option>
            {partners.map((p) => (
              <option key={p.id} value={p.publicId}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Joined</label>
          <select name="since" defaultValue={sp.since ?? ""} className={filterClass}>
            <option value="">Any time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">JourneyPort</label>
          <select name="device" defaultValue={sp.device ?? ""} className={filterClass}>
            <option value="">Any</option>
            <option value="active">Has active device</option>
            <option value="assigned">Assigned, not activated</option>
            <option value="lost">Reported lost</option>
            <option value="none">No device</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Milestones</label>
          <select name="milestones" defaultValue={sp.milestones ?? ""} className={filterClass}>
            <option value="">Any</option>
            <option value="with">Has verified milestones</option>
            <option value="without">No verified milestones</option>
          </select>
        </div>
        <button className="btn-primary !px-4 !py-1.5 !text-[13px]">Apply</button>
        <Link href="/ops/members" className="btn-secondary !py-1.5 !text-[13px]">
          Clear
        </Link>
      </form>

      <Table
        headers={[
          "Member",
          "Journey ID",
          "Joined",
          "JourneyPort",
          "Verified milestones",
          "Last activity",
          "Status",
        ]}
      >
        {members.map((m) => (
          <tr key={m.id} className="transition-colors hover:bg-black/[0.02]">
            <td className="px-4 py-2.5">
              <Link
                href={`/ops/members/${m.id}`}
                className="font-medium text-[var(--color-pink)] hover:underline"
              >
                {m.displayName ?? `${m.firstName} ${m.lastName}`}
              </Link>
            </td>
            <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-secondary)]">
              {m.journeyIdentity?.publicId}
            </td>
            <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{m.createdAt.toLocaleDateString()}</td>
            <td className="px-4 py-2.5">{m.devices.length}</td>
            <td className="px-4 py-2.5">{m._count.milestones}</td>
            <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
              {m.lastLoginAt ? m.lastLoginAt.toLocaleDateString() : "—"}
            </td>
            <td className="px-4 py-2.5">
              <Badge status={m.status} />
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

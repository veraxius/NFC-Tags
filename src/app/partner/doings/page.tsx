import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { resolvePartnerFor } from "@/lib/partner";
import { Table, Badge, DimensionBadge } from "@/components/ui";

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Earthy Doings</h1>
        <Link
          href="/partner/doings/new"
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          + Create
        </Link>
      </div>
      <Table headers={["Activity", "TriSilience", "Date", "Participants", "Verified", "Status"]}>
        {doings.map((d) => (
          <tr key={d.id}>
            <td className="px-4 py-2.5">
              <p className="font-medium text-slate-900">{d.title}</p>
              <p className="font-mono text-xs text-slate-400">{d.publicId}</p>
            </td>
            <td className="px-4 py-2.5">
              <div className="flex flex-wrap gap-1">
                {d.classifications.map((c) => (
                  <DimensionBadge key={c.id} dimension={c.dimension} />
                ))}
              </div>
            </td>
            <td className="px-4 py-2.5 text-slate-600">{d.startAt.toLocaleDateString()}</td>
            <td className="px-4 py-2.5">{d._count.participations}</td>
            <td className="px-4 py-2.5">{d._count.milestones}</td>
            <td className="px-4 py-2.5"><Badge status={d.status} /></td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

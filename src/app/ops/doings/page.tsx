import { db } from "@/lib/db";
import { Table, Badge, DimensionBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

// TRS 44 — Screen 05 EARTHY DOINGS
export default async function OpsDoings() {
  const doings = await db.earthyDoing.findMany({
    include: {
      partner: true,
      classifications: true,
      _count: { select: { participations: true, milestones: { where: { status: "verified" } } } },
    },
    orderBy: { startAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Earthy Doings</h1>
      <Table headers={["Activity", "Partner", "TriSilience", "Date", "Participants", "Verified", "Status"]}>
        {doings.map((d) => (
          <tr key={d.id}>
            <td className="px-4 py-2.5">
              <p className="font-medium text-slate-900">{d.title}</p>
              <p className="font-mono text-xs text-slate-400">{d.publicId}</p>
            </td>
            <td className="px-4 py-2.5 text-slate-600">{d.partner.name}</td>
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

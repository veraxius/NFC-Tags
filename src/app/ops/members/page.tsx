import { db } from "@/lib/db";
import { Table, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

// TRS 41 — Screen 02 MEMBERS
export default async function OpsMembers() {
  const members = await db.user.findMany({
    where: { platformRole: "member" },
    include: {
      journeyIdentity: true,
      devices: { where: { status: "active" } },
      _count: { select: { milestones: { where: { status: "verified" } }, participations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Members</h1>
      <Table headers={["Member", "Journey ID", "Joined", "JourneyPorts", "Verified milestones", "Last activity", "Status"]}>
        {members.map((m) => (
          <tr key={m.id}>
            <td className="px-4 py-2.5 font-medium text-slate-900">{m.displayName}</td>
            <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{m.journeyIdentity?.publicId}</td>
            <td className="px-4 py-2.5 text-slate-600">{m.createdAt.toLocaleDateString()}</td>
            <td className="px-4 py-2.5">{m.devices.length}</td>
            <td className="px-4 py-2.5">{m._count.milestones}</td>
            <td className="px-4 py-2.5 text-slate-600">
              {m.lastLoginAt ? m.lastLoginAt.toLocaleDateString() : "—"}
            </td>
            <td className="px-4 py-2.5"><Badge status={m.status} /></td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

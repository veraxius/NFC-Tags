import { db } from "@/lib/db";
import { Table } from "@/components/ui";

export const dynamic = "force-dynamic";

// TRS 22 — append-only audit trail viewer
export default async function OpsAudit() {
  const events = await db.auditEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Audit Trail</h1>
      <p className="text-sm text-slate-500">Append-only. Most recent 200 events.</p>
      <Table headers={["Time", "Actor", "Action", "Object", "Reason"]}>
        {events.map((e) => (
          <tr key={e.id}>
            <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-500">{e.createdAt.toLocaleString()}</td>
            <td className="px-4 py-2 text-xs">{e.actorType}</td>
            <td className="px-4 py-2 font-mono text-xs font-medium text-slate-800">{e.action}</td>
            <td className="px-4 py-2 text-xs text-slate-500">
              {e.objectType}
              <span className="ml-1 font-mono text-slate-400">{e.objectId.slice(0, 8)}</span>
            </td>
            <td className="px-4 py-2 text-xs text-slate-500">{e.reason ?? "—"}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

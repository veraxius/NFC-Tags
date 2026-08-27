import { db } from "@/lib/db";
import { Table, Badge, DimensionBadge } from "@/components/ui";
import { transitionEarthyDoingAction } from "@/lib/actions";
import { canTransition } from "@/lib/earthyDoings";

export const dynamic = "force-dynamic";

// TRS 44 — SCREEN 05 EARTHY DOINGS
// Columns: Activity | Partner | TriSilience | Date | Participants | Verified | Status
// Actions: Create | Edit | Publish | Pause | Cancel | Archive
export default async function OpsDoings() {
  const doings = await db.earthyDoing.findMany({
    include: {
      partner: true,
      classifications: true,
      _count: { select: { participations: true, milestones: { where: { status: "verified" } } } },
    },
    orderBy: { startAt: "desc" },
  });

  const actionClass =
    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-[#1d1d1f]">Earthy Doings</h1>
        <p className="text-[13px] text-[#86868b]">
          Activities are created by partners from the Partner Dashboard.
        </p>
      </div>
      <Table
        headers={[
          "Activity",
          "Partner",
          "TriSilience",
          "Date",
          "Participants",
          "Verified",
          "Status",
          "Actions",
        ]}
      >
        {doings.map((d) => {
          const publish = transitionEarthyDoingAction.bind(null, d.id, "published");
          const pause = transitionEarthyDoingAction.bind(null, d.id, "paused");
          const cancel = transitionEarthyDoingAction.bind(null, d.id, "cancelled");
          const archive = transitionEarthyDoingAction.bind(null, d.id, "archived");
          return (
            <tr key={d.id}>
              <td className="px-4 py-2.5">
                <p className="font-medium text-[#1d1d1f]">{d.title}</p>
                <p className="font-mono text-xs text-[#86868b]">{d.publicId}</p>
              </td>
              <td className="px-4 py-2.5 text-[#86868b]">{d.partner.name}</td>
              <td className="px-4 py-2.5">
                <div className="flex flex-wrap gap-1">
                  {d.classifications.map((c) => (
                    <DimensionBadge key={c.id} dimension={c.dimension} />
                  ))}
                </div>
              </td>
              <td className="px-4 py-2.5 text-[#86868b]">{d.startAt.toLocaleDateString()}</td>
              <td className="px-4 py-2.5">{d._count.participations}</td>
              <td className="px-4 py-2.5">{d._count.milestones}</td>
              <td className="px-4 py-2.5">
                <Badge status={d.status} />
              </td>
              <td className="px-4 py-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {canTransition(d.status, "published") && (
                    <form action={publish}>
                      <button
                        className={`${actionClass} border-emerald-300 text-emerald-700 hover:bg-emerald-50`}
                      >
                        Publish
                      </button>
                    </form>
                  )}
                  {canTransition(d.status, "paused") && (
                    <form action={pause}>
                      <button
                        className={`${actionClass} border-amber-300 text-amber-700 hover:bg-amber-50`}
                      >
                        Pause
                      </button>
                    </form>
                  )}
                  {canTransition(d.status, "cancelled") && (
                    <form action={cancel}>
                      <button
                        className={`${actionClass} border-red-300 text-red-700 hover:bg-red-50`}
                      >
                        Cancel
                      </button>
                    </form>
                  )}
                  {canTransition(d.status, "archived") && (
                    <form action={archive}>
                      <button
                        className={`${actionClass} border-black/10 text-[#86868b] hover:bg-black/[0.04]`}
                      >
                        Archive
                      </button>
                    </form>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}

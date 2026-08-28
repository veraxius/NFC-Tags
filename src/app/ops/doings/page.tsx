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
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Earthy Doings</h1>
        <p className="text-[13px] text-[var(--color-text-secondary)]">
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
                <p className="font-medium text-[var(--color-text)]">{d.title}</p>
                <p className="font-mono text-xs text-[var(--color-text-secondary)]">{d.publicId}</p>
              </td>
              <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{d.partner.name}</td>
              <td className="px-4 py-2.5">
                <div className="flex flex-wrap gap-1">
                  {d.classifications.map((c) => (
                    <DimensionBadge key={c.id} dimension={c.dimension} />
                  ))}
                </div>
              </td>
              <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{d.startAt.toLocaleDateString()}</td>
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
                        className={`${actionClass} border-[var(--color-mint)] text-[var(--color-mint-ink)] hover:bg-[var(--color-mint-soft)]`}
                      >
                        Publish
                      </button>
                    </form>
                  )}
                  {canTransition(d.status, "paused") && (
                    <form action={pause}>
                      <button
                        className={`${actionClass} border-[var(--color-gold)] text-[var(--color-gold-ink)] hover:bg-[var(--color-gold-soft)]`}
                      >
                        Pause
                      </button>
                    </form>
                  )}
                  {canTransition(d.status, "cancelled") && (
                    <form action={cancel}>
                      <button
                        className={`${actionClass} border-[var(--color-plum)] text-[var(--color-plum)] hover:bg-[var(--color-plum-soft)]`}
                      >
                        Cancel
                      </button>
                    </form>
                  )}
                  {canTransition(d.status, "archived") && (
                    <form action={archive}>
                      <button
                        className={`${actionClass} border-black/10 text-[var(--color-text-secondary)] hover:bg-black/[0.04]`}
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

import { db } from "@/lib/db";
import { Badge, Card } from "@/components/ui";
import { resolveDisputeAction, startDisputeReviewAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

// TRS 49 — Screen 10 DISPUTES
// Columns: Case | Member | Milestone | Reason | Opened | Status | Assigned
// Workflow: OPEN -> UNDER REVIEW -> RESOLVED (verified | revoked)
export default async function OpsDisputes() {
  const disputes = await db.dispute.findMany({
    include: {
      opener: true,
      milestone: { include: { earthyDoing: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const assigneeIds = [...new Set(disputes.map((d) => d.assignedTo).filter(Boolean))] as string[];
  const assignees = assigneeIds.length
    ? await db.user.findMany({ where: { id: { in: assigneeIds } } })
    : [];
  const assigneeName = (id: string | null) =>
    id ? assignees.find((a) => a.id === id)?.displayName ?? "—" : "—";

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">Disputes</h1>
      {disputes.length === 0 && <p className="text-sm text-[var(--color-text-secondary)]">No disputes.</p>}
      <div className="space-y-4">
        {disputes.map((d) => {
          const startReview = startDisputeReviewAction.bind(null, d.id);
          const keepVerified = resolveDisputeAction.bind(null, d.id, "verified", "Reviewed — evidence stands.");
          const revoke = resolveDisputeAction.bind(null, d.id, "revoked", "Reviewed — milestone revoked.");
          return (
            <Card key={d.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-[var(--color-text)]">
                    {d.milestone.earthyDoing.title}
                    <span className="ml-2 font-mono text-xs text-[var(--color-text-secondary)]">{d.publicId}</span>
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Milestone <span className="font-mono">{d.milestone.publicId}</span> · Opened by{" "}
                    {d.opener.displayName} · {d.createdAt.toLocaleString()} · Reason:{" "}
                    <span className="font-medium">{d.reason}</span>
                  </p>
                  {d.description && <p className="mt-1 text-sm text-[var(--color-text)]">{d.description}</p>}
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    Assigned: {assigneeName(d.assignedTo)}
                    {d.underReviewAt && ` · under review since ${d.underReviewAt.toLocaleString()}`}
                  </p>
                  {d.resolution && (
                    <p className="mt-1 text-xs text-[var(--color-pink)]">
                      Resolution ({d.resolutionOutcome}): {d.resolution}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge status={d.status} />
                  {d.status === "open" && (
                    <form action={startReview}>
                      <button className="rounded-full border border-[var(--color-gold)] px-3 py-1.5 text-xs font-semibold text-[var(--color-gold-ink)] hover:bg-[var(--color-gold-soft)]">
                        Take case → Under review
                      </button>
                    </form>
                  )}
                  {d.status === "under_review" && (
                    <>
                      <form action={keepVerified}>
                        <button className="rounded-full border border-[var(--color-mint)] px-3 py-1.5 text-xs font-semibold text-[var(--color-mint-ink)] hover:bg-[var(--color-mint-soft)]">
                          Resolve: keep verified
                        </button>
                      </form>
                      <form action={revoke}>
                        <button className="rounded-full border border-[var(--color-plum)] px-3 py-1.5 text-xs font-semibold text-[var(--color-plum)] hover:bg-[var(--color-plum-soft)]">
                          Resolve: revoke
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

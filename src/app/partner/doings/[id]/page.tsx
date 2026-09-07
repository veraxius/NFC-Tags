import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, isPartnerAdmin } from "@/lib/auth";
import { resolvePartnerFor } from "@/lib/partner";
import { db } from "@/lib/db";
import { listGoalsForPartner, getGoalProgress, listPresentPeople, listContributions } from "@/lib/goals";
import { linkGoalAction, recordContributionAction } from "@/lib/actions";
import { Card, Table, Badge, Kpi, DimensionBadge } from "@/components/ui";
import { StatusPill, Headline, GoalProgress, OrganicCard } from "@/components/organic";

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
    include: { classifications: true, location: true, goal: true },
  });
  if (!doing) notFound();

  const goals = await listGoalsForPartner(partner.id);
  const openGoals = goals.filter((g) => g.goal.status === "active" || g.goal.id === doing.goalId);
  const canManage = isPartnerAdmin(user, partner.id);

  const [participations, goalProgress, present, allContributions] = await Promise.all([
    db.participation.findMany({
      where: { earthyDoingId: doing.id },
      orderBy: { checkInAt: "desc" },
      include: { user: { include: { journeyIdentity: true } }, verification: true },
    }),
    doing.goalId ? getGoalProgress(doing.goalId) : Promise.resolve(null),
    doing.goalId ? listPresentPeople(doing.id) : Promise.resolve([]),
    doing.goalId ? listContributions(doing.goalId) : Promise.resolve([]),
  ]);

  const activeCount = participations.filter((p) => ACTIVE_STATUSES.includes(p.status)).length;
  const verifiedCount = participations.filter((p) => p.verification?.status === "verified").length;

  // Only the contributions logged from THIS activity — the goal itself may
  // span other events too, but here we only want what happened on-site today.
  const contributionsHere = allContributions.filter((c) => c.participation.earthyDoingId === doing.id);
  const alreadyByParticipation = new Map<string, number>();
  for (const c of contributionsHere) {
    alreadyByParticipation.set(c.participationId, (alreadyByParticipation.get(c.participationId) ?? 0) + Number(c.amount));
  }

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

      <Card title="Counts toward">
        {doing.goal ? (
          <p className="text-sm text-[var(--color-text-secondary)]">
            Linked to{" "}
            <Link href={`/partner/goals/${doing.goal.id}`} className="font-semibold text-[var(--color-pink)] hover:underline">
              {doing.goal.title}
            </Link>{" "}
            — everyone here shows up ready to log against it.
          </p>
        ) : (
          <p className="text-sm text-[var(--color-text-secondary)]">Not tied to a goal yet.</p>
        )}
        <form action={linkGoalAction} className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="doingId" value={doing.id} />
          <select
            key={doing.goalId ?? "none"}
            name="goalId"
            defaultValue={doing.goalId ?? ""}
            className="rounded-lg border border-[var(--color-warmgray)] px-3 py-2 text-sm"
          >
            <option value="">Not tied to a goal</option>
            {openGoals.map(({ goal }) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
          <button className="rounded-lg border border-black/10 px-3 py-2 text-xs font-medium hover:bg-black/[0.04]">
            Save
          </button>
        </form>
      </Card>

      {goalProgress && (
        <OrganicCard className="p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            {goalProgress.goal.title}
          </h3>
          <GoalProgress
            title={`${goalProgress.currentValue.toLocaleString()} of ${goalProgress.targetValue.toLocaleString()} ${goalProgress.goal.unit}`}
            currentValue={goalProgress.currentValue}
            targetValue={goalProgress.targetValue}
            unit={goalProgress.goal.unit}
            pct={goalProgress.pct}
            color={goalProgress.goal.status === "completed" ? "var(--color-mint)" : "var(--color-pink)"}
            subtitle={goalProgress.goal.status === "completed" ? "Goal reached 🎉" : "Total across all linked activities"}
          />

          {canManage && (
            <div className="mt-5 border-t border-black/5 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                Log what each person here did
              </p>
              {present.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)]">No one has checked in to this activity yet.</p>
              ) : (
                <ul className="space-y-2">
                  {present.map((p) => {
                    const already = alreadyByParticipation.get(p.id) ?? 0;
                    return (
                      <li
                        key={p.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--color-bg-alt)] px-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-[var(--color-text)]">
                            {p.user.displayName ?? `${p.user.firstName} ${p.user.lastName}`}
                          </p>
                          {already > 0 && (
                            <p className="text-xs text-[var(--color-mint-ink)]">
                              Already logged: {already.toLocaleString()} {goalProgress.goal.unit}
                            </p>
                          )}
                        </div>
                        <form action={recordContributionAction} className="flex items-center gap-2">
                          <input type="hidden" name="goalId" value={goalProgress.goal.id} />
                          <input type="hidden" name="participationId" value={p.id} />
                          <input
                            name="amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            placeholder={goalProgress.goal.unit}
                            className="w-24 rounded-lg border border-black/10 px-2.5 py-2 text-sm"
                          />
                          <button className="rounded-lg bg-[var(--color-pink)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--color-pink-hover)]">
                            Add
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </OrganicCard>
      )}

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

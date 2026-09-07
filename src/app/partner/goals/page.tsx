import Link from "next/link";
import { requireUser, isPartnerAdmin } from "@/lib/auth";
import { resolvePartnerFor } from "@/lib/partner";
import { listGoalsForPartner } from "@/lib/goals";
import { db } from "@/lib/db";
import { OrganicCard, GoalProgress, Headline } from "@/components/organic";
import { Card } from "@/components/ui";
import { createGoalAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

// The client's own request: an easy, findable place — "Objetivos, click en
// él, y ahí aparece cuánto va y quién está en el lugar." One tap from the
// mobile tab bar gets a field admin here.
export default async function PartnerGoals() {
  const user = await requireUser();
  const partner = await resolvePartnerFor(user);
  const canManage = isPartnerAdmin(user, partner.id);
  const [goals, doings] = await Promise.all([
    listGoalsForPartner(partner.id),
    canManage
      ? db.earthyDoing.findMany({ where: { partnerId: partner.id }, orderBy: { startAt: "desc" }, take: 50 })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Headline className="text-2xl">Goals</Headline>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Targets for {partner.name} — filled in by real check-ins, on site.
        </p>
      </div>

      {goals.length === 0 ? (
        <OrganicCard className="p-6 text-sm text-[var(--color-text-secondary)]">
          No goals yet. {canManage ? "Set one below to get started." : "Check back once your organization sets one."}
        </OrganicCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map(({ goal, currentValue, targetValue, pct }) => (
            <Link key={goal.id} href={`/partner/goals/${goal.id}`}>
              <OrganicCard className="p-5 transition-shadow hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
                <GoalProgress
                  title={goal.title}
                  subtitle={goal.status === "completed" ? "Completed 🎉" : goal.description ?? undefined}
                  currentValue={currentValue}
                  targetValue={targetValue}
                  unit={goal.unit}
                  pct={pct}
                  color={goal.status === "completed" ? "var(--color-mint)" : "var(--color-pink)"}
                />
                <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
                  {goal.earthyDoings.length === 0
                    ? "Not tied to an Earthy Doing yet"
                    : `At: ${goal.earthyDoings.map((d) => d.title).join(", ")}`}
                </p>
              </OrganicCard>
            </Link>
          ))}
        </div>
      )}

      {canManage && (
        <Card title="+ New goal">
          <form action={createGoalAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="partnerId" value={partner.id} />
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Title</label>
              <input
                name="title"
                required
                placeholder="e.g. Clean Miami Beach"
                className="w-56 rounded-lg border border-[var(--color-warmgray)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Target</label>
              <input
                name="targetValue"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="20"
                className="w-28 rounded-lg border border-[var(--color-warmgray)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Unit</label>
              <input
                name="unit"
                required
                placeholder="km, kg, ..."
                className="w-28 rounded-lg border border-[var(--color-warmgray)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                Description (optional)
              </label>
              <input
                name="description"
                placeholder="A short note for members"
                className="w-64 rounded-lg border border-[var(--color-warmgray)] px-3 py-2 text-sm"
              />
            </div>
            {doings.length > 0 && (
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                  Which Earthy Doing is this for? (optional)
                </label>
                <select name="earthyDoingId" defaultValue="" className="w-56 rounded-lg border border-[var(--color-warmgray)] px-3 py-2 text-sm">
                  <option value="">Not tied to one yet</option>
                  {doings.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} — {d.startAt.toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button className="rounded-lg bg-[var(--color-pink)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-pink-hover)]">
              Create goal
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}

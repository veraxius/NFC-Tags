import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, isPartnerAdmin, canActForPartner } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getGoalProgress,
  listPresentPeople,
  listPresentPeopleForDoings,
  listContributions,
  listEarthyDoingsForGoal,
} from "@/lib/goals";
import { OrganicCard, GoalProgress, Headline } from "@/components/organic";
import { Table } from "@/components/ui";
import { AutoSubmitSelect } from "@/components/AutoSubmitSelect";
import { recordContributionAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

// The field screen: pick the activity people checked into, see everyone
// who's actually there (a real NFC tap, not a guess), and log what each
// person did — it sums straight into the bar above. Built for a phone, on
// site, in a hurry — big touch targets, minimal typing.
export default async function GoalDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ doingId?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { goal, currentValue, targetValue, pct } = await getGoalProgress(id);
  if (!canActForPartner(user, goal.partnerId)) redirect("/partner/goals");
  const canManage = isPartnerAdmin(user, goal.partnerId);

  // Activities actually tied to this goal drive the roster directly — no
  // picking required, since the goal already knows which ones count. Only
  // when nothing is linked yet do we fall back to a manual picker over the
  // partner's recent activities, because then there's genuinely no way to
  // know which one the admin means.
  const linkedDoings = await listEarthyDoingsForGoal(goal.id);
  const { doingId } = await searchParams;

  let present: Awaited<ReturnType<typeof listPresentPeopleForDoings>>;
  let fallbackDoings: Awaited<ReturnType<typeof listEarthyDoingsForGoal>> = [];
  let selectedFallbackDoingId: string | undefined;

  if (linkedDoings.length > 0) {
    present = await listPresentPeopleForDoings(linkedDoings.map((d) => d.id));
  } else {
    fallbackDoings = await db.earthyDoing.findMany({
      where: { partnerId: goal.partnerId },
      orderBy: { startAt: "desc" },
      take: 50,
    });
    selectedFallbackDoingId = doingId ?? fallbackDoings[0]?.id;
    const selectedFallbackDoing = fallbackDoings.find((d) => d.id === selectedFallbackDoingId);
    present =
      selectedFallbackDoing && selectedFallbackDoingId
        ? (await listPresentPeople(selectedFallbackDoingId)).map((p) => ({ ...p, earthyDoing: selectedFallbackDoing }))
        : [];
  }

  const contributions = await listContributions(goal.id);

  // How much each present person has already put toward this goal, so the
  // admin isn't guessing whether someone was already logged.
  const alreadyByParticipation = new Map<string, number>();
  for (const c of contributions) {
    alreadyByParticipation.set(
      c.participationId,
      (alreadyByParticipation.get(c.participationId) ?? 0) + Number(c.amount)
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/partner/goals" className="text-xs font-medium text-[var(--color-pink)] hover:underline">
          ‹ Goals
        </Link>
        <Headline className="mt-1 text-2xl">{goal.title}</Headline>
        {goal.description && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{goal.description}</p>}
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          {goal.earthyDoings.length === 0 ? (
            "Not tied to an Earthy Doing yet"
          ) : (
            <>
              At:{" "}
              {goal.earthyDoings.map((d, i) => (
                <span key={d.id}>
                  {i > 0 && ", "}
                  <Link href={`/partner/doings/${d.id}`} className="font-medium text-[var(--color-pink)] hover:underline">
                    {d.title}
                  </Link>
                </span>
              ))}
            </>
          )}
        </p>
      </div>

      <OrganicCard className="p-6">
        <GoalProgress
          title={`${currentValue.toLocaleString()} of ${targetValue.toLocaleString()} ${goal.unit}`}
          currentValue={currentValue}
          targetValue={targetValue}
          unit={goal.unit}
          pct={pct}
          color={goal.status === "completed" ? "var(--color-mint)" : "var(--color-pink)"}
          subtitle={goal.status === "completed" ? "Goal reached 🎉" : "In progress"}
        />
      </OrganicCard>

      {canManage && (
        <OrganicCard className="p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            Who's checked in
          </h3>
          {linkedDoings.length === 0 ? (
            <>
              <p className="mb-3 rounded-xl bg-[var(--color-gold-soft)] px-3 py-2 text-xs text-[var(--color-gold-ink)]">
                No activity is tagged to this goal yet — pick which recent one you mean below. Open
                an Earthy Doing and set "Counts toward" so this shows up automatically next time.
              </p>
              <form method="get" className="mb-4">
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                  Earthy Doing
                </label>
                <AutoSubmitSelect
                  name="doingId"
                  defaultValue={selectedFallbackDoingId}
                  className="w-full max-w-sm rounded-lg border border-[var(--color-warmgray)] px-3 py-2.5 text-sm"
                >
                  {fallbackDoings.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} — {d.startAt.toLocaleDateString()}
                    </option>
                  ))}
                </AutoSubmitSelect>
                <noscript>
                  <button className="ml-2 rounded-lg border border-black/10 px-3 py-2 text-xs font-medium hover:bg-black/[0.04]">
                    Switch
                  </button>
                </noscript>
              </form>
            </>
          ) : (
            <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
              Everyone checked in across {linkedDoings.length === 1 ? "this activity" : "these activities"} —
              tap their JourneyPort, they show up here automatically.
            </p>
          )}

          {present.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">
              No one has checked in yet.
            </p>
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
                      {linkedDoings.length > 1 && (
                        <p className="text-xs text-[var(--color-text-secondary)]">{p.earthyDoing.title}</p>
                      )}
                      {already > 0 && (
                        <p className="text-xs text-[var(--color-mint-ink)]">
                          Already logged: {already.toLocaleString()} {goal.unit}
                        </p>
                      )}
                    </div>
                    <form action={recordContributionAction} className="flex items-center gap-2">
                      <input type="hidden" name="goalId" value={goal.id} />
                      <input type="hidden" name="participationId" value={p.id} />
                      <input
                        name="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder={goal.unit}
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
        </OrganicCard>
      )}

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Contribution log
        </h3>
        <Table headers={["Person", "Activity", "Amount", "Recorded by", "When"]}>
          {contributions.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-4 text-sm text-[var(--color-text-secondary)]">
                Nothing logged yet.
              </td>
            </tr>
          ) : (
            contributions.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2.5 font-medium">
                  {c.user.displayName ?? `${c.user.firstName} ${c.user.lastName}`}
                </td>
                <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{c.participation.earthyDoing.title}</td>
                <td className="px-4 py-2.5 font-semibold text-[var(--color-mint-ink)]">
                  {Number(c.amount).toLocaleString()} {goal.unit}
                </td>
                <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                  {c.recorder.displayName ?? c.recorder.firstName}
                </td>
                <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                  {c.createdAt.toLocaleDateString()}
                </td>
              </tr>
            ))
          )}
        </Table>
      </div>
    </div>
  );
}

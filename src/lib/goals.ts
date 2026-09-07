import { db } from "./db";
import { audit } from "./audit";
import { notifyN8n } from "./webhooks";
import { SessionUser, isPartnerAdmin, actorTypeFor } from "./auth";
import { goalPublicId } from "./ids";

// GOALS — an org-level target ("clean 20km of beach") that fills up from
// real, on-site contributions logged against people who actually checked
// in via NFC. Not tied to one Earthy Doing: a campaign like this can span
// several cleanup events over time, all feeding one total.

export class GoalError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function createGoal(params: {
  session: SessionUser;
  partnerId: string;
  title: string;
  description?: string | null;
  unit: string;
  targetValue: number;
  earthyDoingId?: string | null;
}) {
  if (!isPartnerAdmin(params.session, params.partnerId)) {
    throw new GoalError("FORBIDDEN", "Only a partner administrator (or Beaurity) can create goals.", 403);
  }
  if (!(params.targetValue > 0)) {
    throw new GoalError("INVALID_TARGET", "Target must be greater than zero.");
  }

  // Tying the goal to an activity right away (optional) is what lets the
  // field screen skip the "which Earthy Doing" picker entirely from the
  // very first contribution — the same link built retroactively from an
  // Earthy Doing's own "Counts toward" section, just set up in one step.
  if (params.earthyDoingId) {
    const doing = await db.earthyDoing.findFirst({ where: { id: params.earthyDoingId, partnerId: params.partnerId } });
    if (!doing) throw new GoalError("EARTHY_DOING_NOT_FOUND", "That Earthy Doing doesn't belong to this organization.", 404);
  }

  const goal = await db.goal.create({
    data: {
      publicId: goalPublicId(),
      partnerId: params.partnerId,
      title: params.title,
      description: params.description ?? null,
      unit: params.unit,
      targetValue: params.targetValue,
      createdBy: params.session.id,
      earthyDoings: params.earthyDoingId ? { connect: { id: params.earthyDoingId } } : undefined,
    },
  });

  await audit({
    actorType: actorTypeFor(params.session, params.partnerId),
    actorId: params.session.id,
    action: "goal.created",
    objectType: "goal",
    objectId: goal.id,
    newState: { title: goal.title, unit: goal.unit, targetValue: params.targetValue, earthyDoingId: params.earthyDoingId ?? null },
  });

  return goal;
}

// The running total is always computed from the contribution log, never
// stored redundantly — the same "single source of truth" rule the finance
// movements follow, so the bar can never drift from what was actually
// recorded.
export async function getGoalProgress(goalId: string) {
  const [goal, sum] = await Promise.all([
    db.goal.findUniqueOrThrow({
      where: { id: goalId },
      include: { earthyDoings: { select: { id: true, title: true }, orderBy: { startAt: "desc" } } },
    }),
    db.goalContribution.aggregate({ where: { goalId }, _sum: { amount: true } }),
  ]);
  const currentValue = Number(sum._sum.amount ?? 0);
  const targetValue = Number(goal.targetValue);
  return {
    goal,
    currentValue,
    targetValue,
    pct: targetValue > 0 ? Math.min(100, (currentValue / targetValue) * 100) : 0,
  };
}

export async function listGoalsForPartner(partnerId: string) {
  const goals = await db.goal.findMany({ where: { partnerId }, orderBy: { createdAt: "desc" } });
  return Promise.all(goals.map((g) => getGoalProgress(g.id)));
}

// Every organization the member has ever checked into at least once — the
// same scoping rule used elsewhere (People, Finance) so a member only ever
// sees goals for orgs they actually showed up for.
export async function listActiveGoalsForMember(userId: string) {
  const partnerIds = await db.participation.findMany({
    where: { userId },
    select: { partnerId: true },
    distinct: ["partnerId"],
  });
  if (partnerIds.length === 0) return [];

  const goals = await db.goal.findMany({
    where: { partnerId: { in: partnerIds.map((p) => p.partnerId) }, status: "active" },
    include: { partner: true },
    orderBy: { createdAt: "desc" },
  });
  return Promise.all(
    goals.map(async (g) => ({ ...(await getGoalProgress(g.id)), partnerName: g.partner.name }))
  );
}

// Who's actually on-site for a given Earthy Doing right now — anyone who
// tapped in and isn't cancelled/invalid, regardless of verification status.
// Presence is what matters here (someone at the scale with a bag of
// plastic), not whether AIM has confirmed the milestone yet.
export async function listPresentPeople(earthyDoingId: string) {
  return db.participation.findMany({
    where: { earthyDoingId, status: { notIn: ["cancelled", "invalid"] } },
    include: { user: true },
    orderBy: { checkInAt: "desc" },
  });
}

// Same as above, but across every activity tied to a goal at once — so the
// field screen never makes an admin pick "which activity" by hand when the
// goal already knows which ones count toward it.
export async function listPresentPeopleForDoings(earthyDoingIds: string[]) {
  if (earthyDoingIds.length === 0) return [];
  return db.participation.findMany({
    where: { earthyDoingId: { in: earthyDoingIds }, status: { notIn: ["cancelled", "invalid"] } },
    include: { user: true, earthyDoing: true },
    orderBy: { checkInAt: "desc" },
  });
}

export async function recordContribution(params: {
  session: SessionUser;
  goalId: string;
  participationId: string;
  amount: number;
}) {
  const goal = await db.goal.findUniqueOrThrow({ where: { id: params.goalId } });
  if (!isPartnerAdmin(params.session, goal.partnerId)) {
    throw new GoalError("FORBIDDEN", "Only a partner administrator (or Beaurity) can log contributions.", 403);
  }
  if (!(params.amount > 0)) {
    throw new GoalError("INVALID_AMOUNT", "Amount must be greater than zero.");
  }
  const participation = await db.participation.findUniqueOrThrow({ where: { id: params.participationId } });
  if (participation.partnerId !== goal.partnerId) {
    throw new GoalError("MISMATCHED_PARTNER", "That check-in belongs to a different organization.");
  }

  const contribution = await db.goalContribution.create({
    data: {
      goalId: params.goalId,
      userId: participation.userId,
      participationId: params.participationId,
      amount: params.amount,
      recordedBy: params.session.id,
    },
  });

  await audit({
    actorType: actorTypeFor(params.session, goal.partnerId),
    actorId: params.session.id,
    action: "goal.contribution_recorded",
    objectType: "goal_contribution",
    objectId: contribution.id,
    newState: { goalId: params.goalId, userId: participation.userId, amount: params.amount },
  });

  const progress = await getGoalProgress(params.goalId);
  if (progress.currentValue >= progress.targetValue && goal.status === "active") {
    await db.goal.update({ where: { id: goal.id }, data: { status: "completed", completedAt: new Date() } });
    await audit({
      actorType: "system",
      action: "goal.completed",
      objectType: "goal",
      objectId: goal.id,
      newState: { currentValue: progress.currentValue, targetValue: progress.targetValue },
    });
    const partner = await db.partner.findUnique({ where: { id: goal.partnerId } });
    await notifyN8n("goal.completed", {
      goalTitle: goal.title,
      partnerName: partner?.name ?? null,
      targetValue: progress.targetValue,
      unit: goal.unit,
    });
  }

  return contribution;
}

// The activities that actually feed this goal — so the field screen jumps
// straight to the right roster instead of an admin picking one of everything
// recent and possibly grabbing the wrong event.
export async function listEarthyDoingsForGoal(goalId: string) {
  return db.earthyDoing.findMany({ where: { goalId }, orderBy: { startAt: "desc" } });
}

export async function listContributions(goalId: string) {
  return db.goalContribution.findMany({
    where: { goalId },
    include: { user: true, participation: { include: { earthyDoing: true } }, recorder: true },
    orderBy: { createdAt: "desc" },
  });
}

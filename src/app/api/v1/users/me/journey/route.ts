import { db } from "@/lib/db";
import { ok, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";

// TRS 28 — GET /users/me/journey
// The member's Journey: identity + verified milestones + in-flight
// participations, in one timeline-shaped payload (TRS §50).
export const GET = handler(async () => {
  const session = await requireUser();

  const [identity, milestones, inProgress] = await Promise.all([
    db.journeyIdentity.findUnique({ where: { userId: session.id } }),
    db.journeyMilestone.findMany({
      where: { userId: session.id },
      orderBy: { earnedAt: "desc" },
      include: {
        earthyDoing: { include: { partner: true, classifications: true } },
        verification: { include: { aimAssessment: true } },
      },
    }),
    db.participation.findMany({
      where: {
        userId: session.id,
        status: { in: ["detected", "in_progress", "verification_pending"] },
      },
      orderBy: { checkInAt: "desc" },
      include: { earthyDoing: { include: { partner: true, classifications: true } } },
    }),
  ]);

  return ok({
    journey_id: identity?.publicId,
    profile_visibility: identity?.profileVisibility,
    milestones: milestones.map((m) => ({
      id: m.publicId,
      status: m.status,
      earned_at: m.earnedAt,
      verified_at: m.verifiedAt,
      earthy_doing: {
        id: m.earthyDoing.publicId,
        title: m.earthyDoing.title,
        partner: m.earthyDoing.partner.name,
        trisilience: m.earthyDoing.classifications.map((c) => c.dimension),
      },
      aim: m.verification.aimAssessment
        ? {
            result: m.verification.aimAssessment.assessmentResult,
            confidence: m.verification.aimAssessment.confidence,
          }
        : null,
    })),
    in_progress: inProgress.map((p) => ({
      id: p.publicId,
      status: p.status,
      check_in_at: p.checkInAt,
      earthy_doing: {
        id: p.earthyDoing.publicId,
        title: p.earthyDoing.title,
        partner: p.earthyDoing.partner.name,
        trisilience: p.earthyDoing.classifications.map((c) => c.dimension),
      },
    })),
  });
});

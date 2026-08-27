import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser, canActForPartner, isBeaurityAdmin } from "@/lib/auth";

// TRS 32 — GET /verifications/{id}
// The "anatomy of a verification" payload (TRS §45): claim, evidence, AIM
// assessment and decision — never just the outcome.
export const GET = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireUser();
  const { id } = await ctx.params;

  const v = await db.verification.findUnique({
    where: { id },
    include: {
      participation: {
        include: {
          user: { include: { journeyIdentity: true } },
          earthyDoing: { include: { partner: true, classifications: true, location: true } },
          device: true,
        },
      },
      evidence: true,
      aimAssessment: true,
      milestone: true,
    },
  });
  if (!v) return fail("VERIFICATION_NOT_FOUND", "Verification not found.", 404);

  const allowed =
    v.participation.userId === session.id ||
    isBeaurityAdmin(session) ||
    canActForPartner(session, v.partnerId);
  if (!allowed) return fail("FORBIDDEN", "You cannot view this verification.", 403);

  return ok({
    id: v.id,
    status: v.status,
    verification_method: v.verificationMethod,
    policy_version: v.verificationPolicyVersion,
    reason_code: v.reasonCode,
    created_at: v.createdAt,
    verified_at: v.verifiedAt,
    participation: {
      id: v.participation.publicId,
      check_in_at: v.participation.checkInAt,
      check_out_at: v.participation.checkOutAt,
      participant_journey_id: v.participation.user.journeyIdentity?.publicId,
      device_id: v.participation.device?.publicDeviceId ?? null,
    },
    earthy_doing: {
      id: v.participation.earthyDoing.publicId,
      title: v.participation.earthyDoing.title,
      partner: v.participation.earthyDoing.partner.name,
      trisilience: v.participation.earthyDoing.classifications.map((c) => c.dimension),
      location: v.participation.earthyDoing.location?.name ?? null,
    },
    evidence: v.evidence.map((e) => ({
      type: e.evidenceType,
      source: e.source,
      created_at: e.createdAt,
    })),
    aim: v.aimAssessment
      ? {
          assessment_id: v.aimAssessment.id,
          request_id: v.aimAssessment.aimRequestId,
          result: v.aimAssessment.assessmentResult,
          confidence: v.aimAssessment.confidence,
          model_version: v.aimAssessment.modelVersion,
          explanation: JSON.parse(v.aimAssessment.explanation),
        }
      : null,
    milestone: v.milestone ? { id: v.milestone.publicId, status: v.milestone.status } : null,
  });
});

import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser, canActForPartner, isBeaurityAdmin } from "@/lib/auth";

// TRS 31 — GET /participations/{id}
// Visible to the participant themselves, the owning partner's staff, and
// Beaurity operations (TRS §38 permissions matrix).
export const GET = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireUser();
  const { id } = await ctx.params;

  const p = await db.participation.findFirst({
    where: { OR: [{ id }, { publicId: id }] },
    include: {
      earthyDoing: { include: { partner: true, classifications: true } },
      device: true,
      verification: { include: { aimAssessment: true, evidence: true } },
      milestone: true,
    },
  });
  if (!p) return fail("PARTICIPATION_NOT_FOUND", "Participation not found.", 404);

  const allowed =
    p.userId === session.id || isBeaurityAdmin(session) || canActForPartner(session, p.partnerId);
  if (!allowed) return fail("FORBIDDEN", "You cannot view this participation.", 403);

  return ok({
    id: p.publicId,
    status: p.status,
    interaction_type: p.interactionType,
    check_in_at: p.checkInAt,
    check_out_at: p.checkOutAt,
    earthy_doing: {
      id: p.earthyDoing.publicId,
      title: p.earthyDoing.title,
      partner: p.earthyDoing.partner.name,
      trisilience: p.earthyDoing.classifications.map((c) => c.dimension),
    },
    device_id: p.device?.publicDeviceId ?? null,
    verification: p.verification
      ? {
          id: p.verification.id,
          status: p.verification.status,
          evidence_types: p.verification.evidence.map((e) => e.evidenceType),
          aim: p.verification.aimAssessment
            ? {
                result: p.verification.aimAssessment.assessmentResult,
                confidence: p.verification.aimAssessment.confidence,
              }
            : null,
        }
      : null,
    milestone: p.milestone ? { id: p.milestone.publicId, status: p.milestone.status } : null,
  });
});

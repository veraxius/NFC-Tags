import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser, canActForPartner, isBeaurityAdmin, actorTypeFor } from "@/lib/auth";
import { completeParticipation, FlowError } from "@/lib/flow";

// TRS 32 — GET /verifications
// Queue listing for the Verification Control Center (TRS §45), scoped to the
// caller's partner unless they are Beaurity operations.
export const GET = handler(async (req: Request) => {
  const session = await requireUser();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const partnerIds = session.partnerRoles.map((r) => r.partnerId);
  if (!isBeaurityAdmin(session) && partnerIds.length === 0) {
    return fail("FORBIDDEN", "This endpoint is for partner staff and Beaurity operations.", 403);
  }

  const verifications = await db.verification.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(isBeaurityAdmin(session) ? {} : { partnerId: { in: partnerIds } }),
    },
    include: {
      participation: {
        include: {
          user: { include: { journeyIdentity: true } },
          earthyDoing: { include: { partner: true } },
        },
      },
      aimAssessment: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return ok(
    verifications.map((v) => ({
      id: v.id,
      status: v.status,
      created_at: v.createdAt,
      verified_at: v.verifiedAt,
      participation_id: v.participation.publicId,
      // Journey ID rather than name: partner-facing queues do not need the
      // member's legal name to do their job (Architecture doc §25).
      participant_journey_id: v.participation.user.journeyIdentity?.publicId,
      earthy_doing: v.participation.earthyDoing.title,
      partner: v.participation.earthyDoing.partner.name,
      aim: v.aimAssessment
        ? { result: v.aimAssessment.assessmentResult, confidence: v.aimAssessment.confidence }
        : null,
    }))
  );
});

const postSchema = z.object({ participation_id: z.string().min(1) });

// TRS 32 — POST /verifications
// Opens a verification for a participation (same transition the partner
// dashboard performs when marking attendance complete).
export const POST = handler(async (req: Request) => {
  const session = await requireUser();
  const body = postSchema.parse(await req.json());

  const p = await db.participation.findFirst({
    where: { OR: [{ id: body.participation_id }, { publicId: body.participation_id }] },
  });
  if (!p) return fail("PARTICIPATION_NOT_FOUND", "Participation not found.", 404);
  if (!canActForPartner(session, p.partnerId)) {
    return fail("FORBIDDEN", "You are not authorized for this partner's participations.", 403);
  }

  try {
    const verification = await completeParticipation(
      p.id,
      session.id,
      actorTypeFor(session, p.partnerId)
    );
    return ok({ id: verification.id, status: verification.status }, { status: 201 });
  } catch (e) {
    if (e instanceof FlowError) return fail(e.code, e.message, e.status);
    throw e;
  }
});

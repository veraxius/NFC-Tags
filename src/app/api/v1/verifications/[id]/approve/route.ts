import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser, canActForPartner, isBeaurityAdmin, partnerRole } from "@/lib/auth";
import { approveVerification, FlowError } from "@/lib/flow";

const schema = z.object({ notes: z.string().optional() });

// TRS 32 — POST /verifications/{id}/approve
export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  const body = schema.parse(await req.json().catch(() => ({})));

  const v = await db.verification.findUnique({ where: { id } });
  if (!v) return fail("VERIFICATION_NOT_FOUND", "Verification not found.", 404);
  if (!canActForPartner(session, v.partnerId)) {
    return fail("FORBIDDEN", "You are not authorized for this partner's verifications.", 403);
  }

  const actorType = isBeaurityAdmin(session)
    ? "beaurity_admin"
    : partnerRole(session, v.partnerId) === "administrator"
      ? "partner_admin"
      : "partner_operator";

  try {
    const result = await approveVerification({
      verificationId: id,
      actorId: session.id,
      actorType,
      notes: body.notes,
    });
    return ok({
      verification: { id: result.verification.id, status: result.verification.status },
      aim: {
        result: result.assessment.assessmentResult,
        confidence: result.assessment.confidence,
      },
      milestone: { id: result.milestone.publicId, status: result.milestone.status },
    });
  } catch (e) {
    if (e instanceof FlowError) return fail(e.code, e.message, e.status);
    throw e;
  }
});

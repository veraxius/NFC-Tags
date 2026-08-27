import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser, canActForPartner, actorTypeFor } from "@/lib/auth";
import { completeParticipation, FlowError } from "@/lib/flow";

// TRS 31 — POST /participations/{id}/complete
// Partner-side action: marks attendance finished and opens the pending
// verification with the NFC/timestamp evidence attached.
export const POST = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireUser();
  const { id } = await ctx.params;

  const p = await db.participation.findFirst({ where: { OR: [{ id }, { publicId: id }] } });
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
    return ok({
      participation_id: p.publicId,
      verification_id: verification.id,
      verification_status: verification.status,
    });
  } catch (e) {
    if (e instanceof FlowError) return fail(e.code, e.message, e.status);
    throw e;
  }
});

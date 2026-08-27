import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser, canActForPartner, isBeaurityAdmin, actorTypeFor } from "@/lib/auth";
import { cancelParticipation, FlowError } from "@/lib/flow";

const schema = z.object({ reason: z.string().optional() });

// TRS 31 — POST /participations/{id}/cancel
// The participant may withdraw their own participation; partner staff and
// Beaurity operations may cancel one they are responsible for.
export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  const body = schema.parse(await req.json().catch(() => ({})));

  const p = await db.participation.findFirst({ where: { OR: [{ id }, { publicId: id }] } });
  if (!p) return fail("PARTICIPATION_NOT_FOUND", "Participation not found.", 404);

  const isOwner = p.userId === session.id;
  if (!isOwner && !isBeaurityAdmin(session) && !canActForPartner(session, p.partnerId)) {
    return fail("FORBIDDEN", "You cannot cancel this participation.", 403);
  }

  try {
    const updated = await cancelParticipation({
      participationId: p.id,
      actorId: session.id,
      actorType: isOwner && !isBeaurityAdmin(session)
        ? "member"
        : actorTypeFor(session, p.partnerId),
      reason: body.reason,
    });
    return ok({ id: updated.publicId, status: updated.status });
  } catch (e) {
    if (e instanceof FlowError) return fail(e.code, e.message, e.status);
    throw e;
  }
});

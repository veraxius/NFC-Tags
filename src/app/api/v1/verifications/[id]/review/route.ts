import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser, canActForPartner, actorTypeFor } from "@/lib/auth";
import { reviewVerification, FlowError } from "@/lib/flow";

const schema = z.object({
  reason_code: z.string().optional(),
  notes: z.string().optional(),
});

// TRS 32 — POST /verifications/{id}/review
export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  const body = schema.parse(await req.json().catch(() => ({})));

  const v = await db.verification.findUnique({ where: { id } });
  if (!v) return fail("VERIFICATION_NOT_FOUND", "Verification not found.", 404);
  if (!canActForPartner(session, v.partnerId)) {
    return fail("FORBIDDEN", "You are not authorized for this partner's verifications.", 403);
  }

  try {
    const updated = await reviewVerification({
      verificationId: id,
      actorId: session.id,
      actorType: actorTypeFor(session, v.partnerId),
      reasonCode: body.reason_code,
      notes: body.notes,
    });
    return ok({ id: updated.id, status: updated.status, reason_code: updated.reasonCode });
  } catch (e) {
    if (e instanceof FlowError) return fail(e.code, e.message, e.status);
    throw e;
  }
});

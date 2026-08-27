import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser, canActForPartner, isBeaurityAdmin, partnerRole } from "@/lib/auth";
import { rejectVerification, FlowError } from "@/lib/flow";

const schema = z.object({ reason_code: z.string().min(1), notes: z.string().optional() });

export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  const body = schema.parse(await req.json());

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
    const updated = await rejectVerification({
      verificationId: id,
      actorId: session.id,
      actorType,
      reasonCode: body.reason_code,
      notes: body.notes,
    });
    return ok({ id: updated.id, status: updated.status });
  } catch (e) {
    if (e instanceof FlowError) return fail(e.code, e.message, e.status);
    throw e;
  }
});

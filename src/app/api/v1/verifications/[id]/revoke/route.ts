import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser, isBeaurityAdmin, actorTypeFor } from "@/lib/auth";
import { revokeVerification, FlowError } from "@/lib/flow";

const schema = z.object({ reason: z.string().min(1) });

// TRS 32 — POST /verifications/{id}/revoke
// Restricted to Beaurity operations: revoking invalidates a milestone the
// member already holds, so it sits above partner scope (TRS §38).
export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  const body = schema.parse(await req.json());

  if (!isBeaurityAdmin(session)) {
    return fail("FORBIDDEN", "Only Beaurity operations can revoke a verified milestone.", 403);
  }

  const v = await db.verification.findUnique({ where: { id } });
  if (!v) return fail("VERIFICATION_NOT_FOUND", "Verification not found.", 404);

  try {
    const updated = await revokeVerification({
      verificationId: id,
      actorId: session.id,
      actorType: actorTypeFor(session),
      reason: body.reason,
    });
    return ok({ id: updated.id, status: updated.status });
  } catch (e) {
    if (e instanceof FlowError) return fail(e.code, e.message, e.status);
    throw e;
  }
});

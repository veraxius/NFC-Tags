import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser, canActForPartner, isBeaurityAdmin } from "@/lib/auth";

// TRS 32 — GET /verifications/{id}/evidence
export const GET = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireUser();
  const { id } = await ctx.params;

  const v = await db.verification.findUnique({
    where: { id },
    include: { evidence: true, participation: true },
  });
  if (!v) return fail("VERIFICATION_NOT_FOUND", "Verification not found.", 404);

  const allowed =
    v.participation.userId === session.id ||
    isBeaurityAdmin(session) ||
    canActForPartner(session, v.partnerId);
  if (!allowed) return fail("FORBIDDEN", "You cannot view this evidence.", 403);

  return ok(
    v.evidence.map((e) => ({
      id: e.id,
      type: e.evidenceType,
      source: e.source,
      // storage_reference points at the object store; it is only exposed to
      // staff, never to the participant's own client.
      storage_reference: isBeaurityAdmin(session) ? e.storageReference : undefined,
      metadata: JSON.parse(e.metadata),
      hash: e.hash,
      created_at: e.createdAt,
    }))
  );
});

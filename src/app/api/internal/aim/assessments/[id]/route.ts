import { ok, fail, handler } from "@/lib/api";
import { getAssessment } from "@/lib/aim/service";

// TRS §33 — GET /internal/aim/assessments/{id}
// Accepts either our internal assessment id or the original request_id.

export const GET = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const assessment = await getAssessment(id);
  if (!assessment) return fail("ASSESSMENT_NOT_FOUND", "AIM assessment not found.", 404);

  return ok({
    assessment_id: assessment.id,
    request_id: assessment.aimRequestId,
    status: assessment.status,
    result: assessment.assessmentResult,
    confidence: assessment.confidence,
    explanation: JSON.parse(assessment.explanation),
    model_version: assessment.modelVersion,
    requested_at: assessment.requestedAt,
    completed_at: assessment.completedAt,
  });
});

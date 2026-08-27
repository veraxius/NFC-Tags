import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { assessParticipationClaim, AimServiceError } from "@/lib/aim/service";
import { MODEL_VERSION } from "@/lib/aim/config";

// TRS §33 — POST /internal/aim/assess
// Internal-only: this is JourneyPort's own AIM adapter boundary, not part
// of the public /api/v1 surface. No other JourneyPort service should
// depend on AIM's internals — everything goes through this contract.

const signalSchema = z.object({
  type: z.string(),
  value: z.union([z.boolean(), z.string(), z.number()]),
});

const schema = z.object({
  request_id: z.string().min(1),
  subject_type: z.literal("participation_claim"),
  subject_id: z.string().min(1),
  claim: z.object({
    type: z.string(),
    earthy_doing_id: z.string(),
    participant_ref: z.string(),
    partner_ref: z.string(),
    occurred_at: z.string(),
  }),
  signals: z.array(signalSchema),
});

export const POST = handler(async (req: Request) => {
  const body = schema.parse(await req.json());

  try {
    const assessment = await assessParticipationClaim(body);
    return ok({
      request_id: body.request_id,
      assessment_id: assessment.id,
      status: "completed",
      result: assessment.assessmentResult,
      confidence: assessment.confidence,
      explanation: JSON.parse(assessment.explanation),
      model_version: assessment.modelVersion ?? MODEL_VERSION,
    });
  } catch (e) {
    if (e instanceof AimServiceError) return fail(e.code, e.message, e.status);
    throw e;
  }
});

import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import type { AimAssessRequest, AimExplanation } from "./types";
import { normalizeSignals, computeConfidence } from "./engine";
import { classify, CONFIG_VERSION, MODEL_VERSION } from "./config";

export class AimServiceError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function summarize(result: ReturnType<typeof classify>): string {
  if (result === "credible") return "All weighted signals are present and consistent.";
  if (result === "not_credible") return "No supporting signals were present for this claim.";
  return "Some but not all weighted signals were present; routed for human review.";
}

// TRS §33-35 — the single implementation of "assess a participation_claim".
// Both the internal HTTP route and JourneyPort's in-process AIM client call
// this same function, so there is exactly one place the decision is made.
//
// AIM assesses the CLAIM's credibility using only the signals it was given —
// it does not reach into JourneyPort's Evidence table itself. The caller is
// responsible for deriving `signals` from whatever evidence it has; this
// keeps the adapter boundary real, not just nominal.
export async function assessParticipationClaim(request: AimAssessRequest) {
  if (request.subject_type !== "participation_claim") {
    throw new AimServiceError(
      "UNSUPPORTED_SUBJECT_TYPE",
      `AIM does not support subject_type '${request.subject_type}'.`,
      422
    );
  }

  const participation = await db.participation.findUnique({
    where: { publicId: request.subject_id },
    include: { verification: true },
  });
  if (!participation) {
    throw new AimServiceError(
      "SUBJECT_NOT_FOUND",
      `No participation found for subject_id '${request.subject_id}'.`,
      404
    );
  }
  if (!participation.verification) {
    throw new AimServiceError(
      "NO_VERIFICATION_FOR_CLAIM",
      "This participation has no verification record to attach the assessment to.",
      409
    );
  }

  const factors = normalizeSignals(request.signals);
  const confidence = computeConfidence(factors);
  const result = classify(confidence);

  const explanation: AimExplanation = {
    config_version: CONFIG_VERSION,
    claim: request.claim,
    signals_received: request.signals,
    factors,
    summary: summarize(result),
  };

  const assessment = await db.aimAssessment.upsert({
    where: { verificationId: participation.verification.id },
    create: {
      verificationId: participation.verification.id,
      aimRequestId: request.request_id,
      status: "completed",
      assessmentResult: result,
      confidence,
      explanation: JSON.stringify(explanation),
      modelVersion: MODEL_VERSION,
      completedAt: new Date(),
    },
    update: {
      // NOTE: aim_assessments.verification_id is unique in the current
      // schema (one assessment per verification). Re-assessment overwrites
      // the previous result rather than keeping full history. If the
      // product later needs a full assessment history per verification,
      // that requires a schema change (drop the unique constraint, key
      // history by aim_request_id instead) — flagged here, not done
      // silently.
      aimRequestId: request.request_id,
      status: "completed",
      assessmentResult: result,
      confidence,
      explanation: JSON.stringify(explanation),
      modelVersion: MODEL_VERSION,
      completedAt: new Date(),
    },
  });

  await audit({
    actorType: "aim",
    action: "aim.assessment_completed",
    objectType: "aim_assessment",
    objectId: assessment.id,
    newState: { result, confidence, modelVersion: MODEL_VERSION, requestId: request.request_id },
  });

  return assessment;
}

export async function getAssessment(idOrRequestId: string) {
  return db.aimAssessment.findFirst({
    where: { OR: [{ id: idOrRequestId }, { aimRequestId: idOrRequestId }] },
  });
}

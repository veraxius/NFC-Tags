import { db } from "./db";
import { audit } from "./audit";
import { aimRequestId } from "./ids";

// TRS 33-35 — AIM Trust Layer adapter.
// JourneyPort services never talk to AIM directly; they call this adapter.
// The MVP ships with a deterministic, explainable internal evaluator.
// When the production AIM API contract (decision D09) is finalized, only this
// file changes: replace `evaluateSignals` with an HTTP call to the AIM API.

export type AimSignal = { type: string; value: boolean | string | number };

const MODEL_VERSION = "aim-internal-mvp-0.1";

// Signal weights: only signals the platform actually captures (TRS 34 —
// "JourneyPort SHALL NOT invent AIM trust factors").
const SIGNAL_WEIGHTS: Record<string, number> = {
  nfc_interaction: 0.35,
  partner_confirmation: 0.35,
  timestamp_within_event_window: 0.15,
  partner_approved_status: 0.15,
};

function evaluateSignals(signals: AimSignal[]) {
  let score = 0;
  let possible = 0;
  const factors: { signal: string; present: boolean; weight: number }[] = [];
  for (const [type, weight] of Object.entries(SIGNAL_WEIGHTS)) {
    const s = signals.find((x) => x.type === type);
    const present = s?.value === true;
    possible += weight;
    if (present) score += weight;
    factors.push({ signal: type, present, weight });
  }
  const confidence = possible > 0 ? Number((score / possible).toFixed(2)) : 0;
  const result =
    confidence >= 0.8 ? "credible" : confidence >= 0.5 ? "inconclusive" : "not_credible";
  return { result, confidence, factors };
}

// Internal interface (TRS 33): assess a verification's evidence.
export async function requestAimAssessment(verificationId: string) {
  const verification = await db.verification.findUniqueOrThrow({
    where: { id: verificationId },
    include: {
      evidence: true,
      partner: true,
      participation: { include: { earthyDoing: true } },
    },
  });

  const p = verification.participation;
  const signals: AimSignal[] = [
    {
      type: "nfc_interaction",
      value: verification.evidence.some((e) => e.evidenceType === "nfc_tap"),
    },
    {
      type: "partner_confirmation",
      value: verification.evidence.some((e) => e.evidenceType === "partner_confirmation"),
    },
    {
      type: "timestamp_within_event_window",
      value:
        p.checkInAt >= new Date(p.earthyDoing.startAt.getTime() - 60 * 60 * 1000) &&
        p.checkInAt <= new Date(p.earthyDoing.endAt.getTime() + 60 * 60 * 1000),
    },
    {
      type: "partner_approved_status",
      value: ["approved", "active"].includes(verification.partner.status),
    },
  ];

  const { result, confidence, factors } = evaluateSignals(signals);

  const assessment = await db.aimAssessment.upsert({
    where: { verificationId },
    create: {
      verificationId,
      aimRequestId: aimRequestId(),
      status: "completed",
      assessmentResult: result,
      confidence,
      explanation: JSON.stringify({
        summary:
          result === "credible"
            ? "All required verification signals are present and consistent."
            : "One or more verification signals are missing or inconsistent.",
        signals,
        factors,
      }),
      modelVersion: MODEL_VERSION,
      completedAt: new Date(),
    },
    update: {
      status: "completed",
      assessmentResult: result,
      confidence,
      explanation: JSON.stringify({
        summary:
          result === "credible"
            ? "All required verification signals are present and consistent."
            : "One or more verification signals are missing or inconsistent.",
        signals,
        factors,
      }),
      modelVersion: MODEL_VERSION,
      completedAt: new Date(),
    },
  });

  await audit({
    actorType: "aim",
    action: "aim.assessment_completed",
    objectType: "aim_assessment",
    objectId: assessment.id,
    newState: { result, confidence, modelVersion: MODEL_VERSION },
  });

  return assessment;
}

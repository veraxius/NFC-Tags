// AIM Trust Layer — internal contract types (TRS v1.0 §34-35).
// This is the ONLY shape JourneyPort and AIM agree on. Neither side should
// assume anything about the other beyond this contract.

// Signals the current JourneyPort MVP is able to capture and send.
// Adding a new signal here requires explicit product confirmation before
// the engine may act on it (TRS §34 — "JourneyPort SHALL NOT invent AIM
// trust factors").
export type AimSignalType = "partner_confirmation" | "nfc_interaction";

export type AimSignal = {
  // Accepts any string so unrecognized/future signal types don't break
  // parsing — the engine simply ignores anything it doesn't recognize.
  type: AimSignalType | (string & {});
  value: boolean | string | number;
};

export type AimClaim = {
  type: string; // e.g. "earthy_doing_completed"
  earthy_doing_id: string;
  participant_ref: string;
  partner_ref: string;
  occurred_at: string; // ISO timestamp
};

export type AimAssessRequest = {
  request_id: string;
  subject_type: "participation_claim";
  subject_id: string; // participation public id, e.g. "PART-..."
  claim: AimClaim;
  signals: AimSignal[];
};

export type AimResult = "credible" | "needs_review" | "not_credible";

export type AimAssessResponse = {
  request_id: string;
  assessment_id: string;
  status: "completed";
  result: AimResult;
  confidence: number;
  explanation: AimExplanation;
  model_version: string;
};

export type AimFactor = {
  signal: AimSignalType;
  weight: number;
  present: boolean;
  contribution: number;
};

export type AimExplanation = {
  config_version: string;
  claim: AimClaim;
  signals_received: AimSignal[];
  factors: AimFactor[];
  summary: string;
};

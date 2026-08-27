import type { AimSignalType, AimResult } from "./types";

// Versioned, auditable configuration for the AIM engine.
// Never hardcode weights/thresholds in the UI or in decision logic —
// everything the engine decides with lives here, and every assessment
// records CONFIG_VERSION so past decisions stay explainable even after
// this file changes.

export const CONFIG_VERSION = "aim-config-2026.1";
export const MODEL_VERSION = "aim-internal-mvp-0.2";

// Only signals the JourneyPort MVP actually captures today:
//   - nfc_interaction: the participation carries NFC tap evidence
//   - partner_confirmation: the partner operator confirmed the participation
// Weighted equally (0.5 / 0.5) — the TRS gives no documented basis for
// weighting one above the other, and inventing an asymmetry would itself
// be an invented trust factor. Revisit when more signals are confirmed
// (location, attached evidence, etc.) — this table is the only place
// that should change.
export const SIGNAL_WEIGHTS: Record<AimSignalType, number> = {
  partner_confirmation: 0.5,
  nfc_interaction: 0.5,
};

// With exactly 2 equally-weighted binary signals, "credible" requiring
// both present (confidence == 1.0) is the only threshold that isn't an
// arbitrary cut between two possible states. Once more signals exist,
// this should likely move to a looser threshold (e.g. >= 0.8) instead of
// requiring 100% — that change belongs here, not scattered in code.
export const THRESHOLDS = {
  credible: 1.0, // confidence >= credible -> "credible"
  notCredible: 0, // confidence <= notCredible -> "not_credible"
};

export function classify(confidence: number): AimResult {
  if (confidence >= THRESHOLDS.credible) return "credible";
  if (confidence <= THRESHOLDS.notCredible) return "not_credible";
  return "needs_review";
}

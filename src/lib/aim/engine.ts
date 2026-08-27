import type { AimFactor, AimSignal, AimSignalType } from "./types";
import { SIGNAL_WEIGHTS } from "./config";

// Pure evaluation logic — no DB, no I/O. Takes exactly the signals it was
// given and normalizes them into weighted, explainable factors. Never
// derives signals on its own from anything other than the input array
// (design principle: signals come from the caller, not invented here).

const SUPPORTED_SIGNALS = Object.keys(SIGNAL_WEIGHTS) as AimSignalType[];

export function normalizeSignals(signals: AimSignal[]): AimFactor[] {
  return SUPPORTED_SIGNALS.map((type) => {
    const received = signals.find((s) => s.type === type);
    const present = received?.value === true;
    const weight = SIGNAL_WEIGHTS[type];
    return {
      signal: type,
      weight,
      present,
      contribution: present ? weight : 0,
    };
  });
}

export function computeConfidence(factors: AimFactor[]): number {
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  if (totalWeight === 0) return 0;
  const achieved = factors.reduce((sum, f) => sum + f.contribution, 0);
  return Number((achieved / totalWeight).toFixed(4));
}

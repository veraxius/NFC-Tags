import { db } from "./db";
import { aimRequestId } from "./ids";
import { assessParticipationClaim } from "./aim/service";
import type { AimAssessRequest, AimSignal } from "./aim/types";

// TRS §33 — JourneyPort's in-process AIM client.
// This is the ONLY file in the application that knows how to turn
// JourneyPort's own data (Evidence, Participation, Partner) into the
// AIM contract payload. Everything downstream of this file (the AIM
// adapter itself, in src/lib/aim/*) only ever sees the contract shape —
// it never queries JourneyPort's Evidence table directly.
//
// This calls assessParticipationClaim() as a direct function call rather
// than over HTTP loopback (same process, same request) — but the payload
// it builds is byte-for-byte the same one POST /internal/aim/assess
// accepts, so nothing here depends on that being true. If AIM is ever
// split into its own service, only the final call in this file changes
// to an actual fetch().

// Derive only the signals AIM currently supports (TRS §34 — "JourneyPort
// SHOULD send only signals supported by the actual AIM implementation").
function deriveSignals(evidence: { evidenceType: string }[]): AimSignal[] {
  return [
    {
      type: "nfc_interaction",
      value: evidence.some((e) => e.evidenceType === "nfc_tap"),
    },
    {
      type: "partner_confirmation",
      value: evidence.some((e) => e.evidenceType === "partner_confirmation"),
    },
  ];
}

// Internal interface (TRS §33): assess a verification's evidence.
export async function requestAimAssessment(verificationId: string) {
  const verification = await db.verification.findUniqueOrThrow({
    where: { id: verificationId },
    include: {
      evidence: true,
      partner: true,
      participation: {
        include: {
          earthyDoing: true,
          user: { include: { journeyIdentity: true } },
        },
      },
    },
  });

  const p = verification.participation;

  const request: AimAssessRequest = {
    request_id: aimRequestId(),
    subject_type: "participation_claim",
    subject_id: p.publicId,
    claim: {
      type: "earthy_doing_completed",
      earthy_doing_id: p.earthyDoing.publicId,
      participant_ref: p.user.journeyIdentity?.publicId ?? p.userId,
      partner_ref: verification.partner.publicId,
      occurred_at: p.checkInAt.toISOString(),
    },
    signals: deriveSignals(verification.evidence),
  };

  return assessParticipationClaim(request);
}

import type { ReactNode } from "react";

// Warmer building blocks for the member (Journey) and Partner Dashboard
// surfaces — the parts of the app an NGO coordinator or a member actually
// lives in. Deliberately separate from components/ui.tsx: Operations stays
// exactly as it is, because that screen is Beaurity's own internal tool and
// its density is appropriate there. Nothing here is imported by /ops/*.

// ---------- Plain-language status ----------
// Same color system as the rest of the app (Beaurity brand tokens), but the
// LABEL is a short human sentence instead of a raw enum value. This is the
// fix for "AIM: credible (100%)" / "verification_pending" reading like a
// database dump instead of a message to a person.

type Tone = "good" | "pending" | "attention" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  good: "bg-[var(--color-mint-soft)] text-[var(--color-mint-ink)]",
  pending: "bg-[var(--color-gold-soft)] text-[var(--color-gold-ink)]",
  attention: "bg-[var(--color-plum-soft)] text-[var(--color-plum)]",
  neutral: "bg-[var(--color-warmgray-soft)] text-[var(--color-warmgray-ink)]",
};

const MILESTONE_STATUS: Record<string, { label: string; tone: Tone }> = {
  verified: { label: "Verified", tone: "good" },
  pending: { label: "Being reviewed", tone: "pending" },
  rejected: { label: "Couldn't be confirmed", tone: "attention" },
  disputed: { label: "You flagged this — under review", tone: "attention" },
  revoked: { label: "No longer valid", tone: "attention" },
};

const PARTICIPATION_STATUS: Record<string, { label: string; tone: Tone }> = {
  detected: { label: "Checked in", tone: "pending" },
  in_progress: { label: "Checked in", tone: "pending" },
  verification_pending: { label: "Waiting on confirmation", tone: "pending" },
  completed: { label: "Completed", tone: "good" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  invalid: { label: "Cancelled", tone: "neutral" },
};

const VERIFICATION_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Needs your review", tone: "pending" },
  review: { label: "Needs a closer look", tone: "pending" },
  verified: { label: "Verified", tone: "good" },
  rejected: { label: "Rejected", tone: "attention" },
  disputed: { label: "Disputed", tone: "attention" },
  revoked: { label: "Revoked", tone: "attention" },
};

const DEVICE_STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "good" },
  assigned: { label: "Ready to activate", tone: "pending" },
  suspended: { label: "Paused", tone: "neutral" },
  lost: { label: "Deactivated", tone: "attention" },
  stolen: { label: "Deactivated", tone: "attention" },
  replaced: { label: "Replaced", tone: "neutral" },
  revoked: { label: "Deactivated", tone: "attention" },
  retired: { label: "Retired", tone: "neutral" },
};

const DISPUTE_STATUS: Record<string, { label: string; tone: Tone }> = {
  open: { label: "Waiting for review", tone: "pending" },
  under_review: { label: "Being looked at", tone: "pending" },
  resolved: { label: "Resolved", tone: "good" },
};

const STATUS_MAPS = [
  MILESTONE_STATUS,
  PARTICIPATION_STATUS,
  VERIFICATION_STATUS,
  DEVICE_STATUS,
  DISPUTE_STATUS,
];

function humanStatus(status: string): { label: string; tone: Tone } {
  for (const map of STATUS_MAPS) {
    if (map[status]) return map[status];
  }
  return { label: status.replace(/_/g, " "), tone: "neutral" };
}

export function StatusPill({ status }: { status: string }) {
  const { label, tone } = humanStatus(status);
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}

// ---------- AIM, in one honest sentence ----------
// The full signal-by-signal breakdown stays in Operations for audit
// purposes. Here, a person just needs to know whether it checked out.

export function trustSummary(
  result: string | null | undefined,
  partnerName?: string
): string {
  if (result === "credible") {
    return partnerName
      ? `Your tap and ${partnerName}'s confirmation both checked out.`
      : "Every signal we could check lined up.";
  }
  if (result === "not_credible") {
    return "We couldn't line up enough evidence for this one.";
  }
  return "One piece of evidence is still missing — a person will take a look.";
}

// ---------- Organic card ----------
// Softer, larger radius than the Apple-glass system used elsewhere, warm
// shadow, optional colored accent bar tied to a TriSilience dimension so a
// card carries a little of its own meaning at a glance.

const DIMENSION_ACCENT: Record<string, string> = {
  SELF_SUSTAINABILITY: "var(--color-pink)",
  EMOTIONAL_PROSPERITY: "var(--color-peach)",
  ENVIRONMENTAL_EQUITY: "var(--color-mint)",
};

export function OrganicCard({
  children,
  accentDimension,
  className = "",
}: {
  children: ReactNode;
  accentDimension?: string;
  className?: string;
}) {
  const accent = accentDimension ? DIMENSION_ACCENT[accentDimension] : undefined;
  return (
    <div
      className={`overflow-hidden rounded-[26px] border border-[var(--color-divider)] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] ${className}`}
      style={accent ? { borderTop: `4px solid ${accent}` } : undefined}
    >
      {children}
    </div>
  );
}

// A warm section heading for member/partner pages — pairs with the wordmark
// typeface so headlines feel like part of the same brand voice, while body
// copy stays on the clean, highly-legible system font.
export function Headline({
  children,
  className = "",
  as: Tag = "h1",
}: {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <Tag className={`wordmark text-[var(--color-text)] ${className}`}>{children}</Tag>
  );
}

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

// ---------- Pie chart ----------
// Hand-built SVG, no charting dependency — same approach as the Venn motif
// on the public landing page (src/components/landing/TripleImpact.tsx).

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export type PieSlice = { label: string; value: number; color: string };

export function PieChart({ data, size = 160 }: { data: PieSlice[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = size / 2;
  let cursor = 0;
  const slices = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const startAngle = (cursor / total) * 360;
      cursor += d.value;
      const endAngle = (cursor / total) * 360;
      return { ...d, startAngle, endAngle };
    });

  return (
    <div className="flex flex-wrap items-center gap-6">
      {total === 0 ? (
        <div
          className="flex shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--color-divider)] text-xs text-[var(--color-text-secondary)]"
          style={{ width: size, height: size }}
        >
          No data yet
        </div>
      ) : (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
          {slices.map((s) => (
            <path key={s.label} d={arcPath(r, r, r, s.startAngle, s.endAngle)} fill={s.color} />
          ))}
        </svg>
      )}
      <ul className="space-y-1.5 text-sm">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="text-[var(--color-text)]">{d.label}</span>
            <span className="text-[var(--color-text-secondary)]">
              {total > 0 ? `${Math.round((d.value / total) * 100)}%` : "0%"} ({d.value})
            </span>
          </li>
        ))}
      </ul>
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

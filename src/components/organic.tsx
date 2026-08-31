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

// ---------- Impact ring ----------
// Circular progress indicator (plain SVG, stroke-dasharray) — the "Impact
// Score" ring look from the brand's own dashboard mockup.

export function ImpactRing({
  pct,
  value,
  label,
  color = "var(--color-mint)",
  size = 120,
}: {
  pct: number;
  value: string | number;
  label: string;
  color?: string;
  size?: number;
}) {
  const stroke = size * 0.11;
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = c - (clamped / 100) * c;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g className="-rotate-90" style={{ transformOrigin: "center" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-bg-alt)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </g>
        <path
          d="M12 20s-7-4.3-9.3-8.7C1.3 8 3 4.8 6.4 4.5c2-.2 3.6 1 5.6 3 2-2 3.6-3.2 5.6-3 3.4.3 5.1 3.5 3.7 6.8C19 15.7 12 20 12 20Z"
          fill={color}
          transform={`translate(${size / 2 - 12}, ${size / 2 - 12})`}
        />
      </svg>
      <div>
        <p className="text-2xl font-semibold text-[var(--color-text)]">{value}</p>
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">{label}</p>
      </div>
    </div>
  );
}

// ---------- Segmented bar ----------
// One horizontal multi-color bar + legend — the "Your Impact Distribution"
// look (Self/People/Planet), reused on both the Partner and Journey pages.

export type BarSegment = { label: string; value: number; color: string; pts?: number };

export function SegmentedBar({ segments }: { segments: BarSegment[] }) {
  const total = segments.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--color-bg-alt)]">
        {segments.map((s) => (
          <div
            key={s.label}
            style={{ width: total > 0 ? `${(s.value / total) * 100}%` : 0, background: s.color }}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        {segments.map((s) => (
          <div key={s.label}>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
            <p className="mt-0.5 font-semibold text-[var(--color-text)]">
              {s.pts ?? s.value} <span className="font-normal text-[var(--color-text-secondary)]">pts</span>
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {total > 0 ? Math.round((s.value / total) * 100) : 0}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Trend line ----------
// Small hand-drawn line + soft-filled area chart, no charting dependency.
// Not bezier-smoothed — a straight-segment polyline, close to the mockup's
// look without the extra complexity of curve interpolation.

export function TrendLine({
  points,
  color = "var(--color-pink)",
  height = 120,
  sparkline = false,
}: {
  points: { label: string; value: number }[];
  color?: string;
  height?: number;
  sparkline?: boolean;
}) {
  const width = 320;
  const padding = sparkline ? 4 : 24;
  const max = Math.max(1, ...points.map((p) => p.value));
  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: padding + i * stepX,
    y: height - padding - (p.value / max) * (height - padding * (sparkline ? 2 : 3)),
  }));
  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1]?.x ?? padding} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id={`trend-fill-${color.replace(/[^a-zA-Z]/g, "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {coords.length > 1 && (
        <>
          <path d={areaPath} fill={`url(#trend-fill-${color.replace(/[^a-zA-Z]/g, "")})`} stroke="none" />
          <path d={linePath} fill="none" stroke={color} strokeWidth={sparkline ? 2 : 2.5} strokeLinejoin="round" strokeLinecap="round" />
        </>
      )}
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={sparkline ? 0 : 3} fill={color} />
      ))}
      {!sparkline &&
        points.map((p, i) => (
          <text
            key={p.label}
            x={coords[i].x}
            y={height - 4}
            fontSize="10"
            textAnchor="middle"
            fill="var(--color-text-secondary)"
          >
            {p.label}
          </text>
        ))}
    </svg>
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

"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { logoutAction } from "@/lib/actions";
import { DIMENSION_LABELS } from "@/lib/dimensions";

export { DIMENSION_LABELS };

// Color roles below follow the Beaurity Brand Color Palette Guidelines
// (v1.0, May 2025). Pink is reserved for primary actions/links only, so it
// never appears on a status pill — that keeps "this is clickable" visually
// distinct from "this is a status."

// Self-Sustainability -> Pink (confidence, empowerment, independence)
// Emotional Prosperity -> Peach Blossom (warmth, kindness, connection)
// Environmental Equity -> Mint Fresh (growth, renewal)
export const DIMENSION_COLORS: Record<string, string> = {
  SELF_SUSTAINABILITY:
    "bg-[var(--color-pink-soft)] text-[var(--color-pink-ink)] border-[var(--color-pink)]/25",
  EMOTIONAL_PROSPERITY:
    "bg-[var(--color-peach-soft)] text-[var(--color-peach-ink)] border-[var(--color-peach)]/50",
  ENVIRONMENTAL_EQUITY:
    "bg-[var(--color-mint-soft)] text-[var(--color-mint-ink)] border-[var(--color-mint)]/50",
};

// good=Mint · info=Peach · warning=Gold · neutral=Warm Gray · danger=Deep Plum
// (brand has no red; Plum is the darkest, most serious color available) ·
// disputed=Teal Wave ("balance, healing, and clarity" fits a case awaiting resolution)
const STATUS_COLORS: Record<string, string> = {
  verified: "bg-[var(--color-mint-soft)] text-[var(--color-mint-ink)]",
  active: "bg-[var(--color-mint-soft)] text-[var(--color-mint-ink)]",
  approved: "bg-[var(--color-mint-soft)] text-[var(--color-mint-ink)]",
  completed: "bg-[var(--color-mint-soft)] text-[var(--color-mint-ink)]",
  credible: "bg-[var(--color-mint-soft)] text-[var(--color-mint-ink)]",
  resolved: "bg-[var(--color-mint-soft)] text-[var(--color-mint-ink)]",
  published: "bg-[var(--color-peach-soft)] text-[var(--color-peach-ink)]",
  detected: "bg-[var(--color-peach-soft)] text-[var(--color-peach-ink)]",
  assigned: "bg-[var(--color-peach-soft)] text-[var(--color-peach-ink)]",
  pending: "bg-[var(--color-gold-soft)] text-[var(--color-gold-ink)]",
  verification_pending: "bg-[var(--color-gold-soft)] text-[var(--color-gold-ink)]",
  review: "bg-[var(--color-gold-soft)] text-[var(--color-gold-ink)]",
  inconclusive: "bg-[var(--color-gold-soft)] text-[var(--color-gold-ink)]",
  under_review: "bg-[var(--color-gold-soft)] text-[var(--color-gold-ink)]",
  open: "bg-[var(--color-gold-soft)] text-[var(--color-gold-ink)]",
  draft: "bg-[var(--color-warmgray-soft)] text-[var(--color-warmgray-ink)]",
  inventory: "bg-[var(--color-warmgray-soft)] text-[var(--color-warmgray-ink)]",
  rejected: "bg-[var(--color-plum-soft)] text-[var(--color-plum)]",
  not_credible: "bg-[var(--color-plum-soft)] text-[var(--color-plum)]",
  revoked: "bg-[var(--color-plum-soft)] text-[var(--color-plum)]",
  suspended: "bg-[var(--color-plum-soft)] text-[var(--color-plum)]",
  lost: "bg-[var(--color-plum-soft)] text-[var(--color-plum)]",
  stolen: "bg-[var(--color-plum-soft)] text-[var(--color-plum)]",
  invalid: "bg-[var(--color-plum-soft)] text-[var(--color-plum)]",
  disputed: "bg-[var(--color-teal-soft)] text-[var(--color-teal-ink)]",
};

export function Badge({ status }: { status: string }) {
  const color =
    STATUS_COLORS[status] ??
    "bg-[var(--color-warmgray-soft)] text-[var(--color-warmgray-ink)]";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function DimensionBadge({ dimension }: { dimension: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${
        DIMENSION_COLORS[dimension] ??
        "bg-[var(--color-warmgray-soft)] text-[var(--color-warmgray-ink)] border-[var(--color-warmgray)]"
      }`}
    >
      {DIMENSION_LABELS[dimension] ?? dimension}
    </span>
  );
}

export function Card({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`glass p-5 ${className}`}>
      {title && (
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

// deltaPct = % change vs. the prior comparison period; omit when there's
// nothing meaningful to compare against (e.g. previous period was zero).
export function Kpi({
  label,
  value,
  accent = false,
  deltaPct,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  deltaPct?: number | null;
}) {
  return (
    <div className="glass p-4">
      <div className="flex items-baseline gap-2">
        <div
          className={`text-2xl font-semibold tracking-tight ${
            accent ? "text-[var(--color-mint-ink)]" : "text-[var(--color-text)]"
          }`}
        >
          {value}
        </div>
        {deltaPct != null && (
          <span
            className={`text-xs font-semibold ${
              deltaPct > 0
                ? "text-[var(--color-mint-ink)]"
                : deltaPct < 0
                  ? "text-[var(--color-plum)]"
                  : "text-[var(--color-text-secondary)]"
            }`}
          >
            {deltaPct > 0 ? "↑" : deltaPct < 0 ? "↓" : "•"} {Math.abs(Math.round(deltaPct))}%
          </span>
        )}
      </div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
        {label}
      </div>
    </div>
  );
}

export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="glass overflow-x-auto p-0">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--color-divider)]">
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-divider)]">{children}</tbody>
      </table>
    </div>
  );
}

export function NavBar({
  title,
  links,
  user,
}: {
  title: string;
  links: { href: string; label: string }[];
  user?: { displayName: string } | null;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`glass-nav sticky top-0 z-50 ${scrolled ? "glass-nav-scrolled" : ""}`}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <Image
            src="/beaurity-imagen.png"
            alt="Beaurity"
            width={512}
            height={512}
            className="-my-2 h-8 w-8 sm:h-9 sm:w-9"
          />
          <span className="wordmark whitespace-nowrap text-[18px] leading-none text-[var(--color-text)] sm:text-[20px]">
            Beaurity
          </span>
          <span className="hidden h-4 w-px bg-[var(--color-divider)] sm:block" />
          <span className="hidden text-xs font-normal text-[var(--color-text-secondary)] sm:inline">
            {title}
          </span>
        </Link>
        <nav className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-[var(--color-text)]/80">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="transition-colors hover:text-[var(--color-pink)]"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-3 text-[13px] text-[var(--color-text-secondary)]">
          <form action={logoutAction}>
            <button className="whitespace-nowrap rounded-full border border-black/10 px-3 py-1.5 text-xs text-[var(--color-text)] transition-colors hover:bg-black/[0.04]">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { logoutAction } from "@/lib/actions";

export const DIMENSION_LABELS: Record<string, string> = {
  SELF_SUSTAINABILITY: "Self-Sustainability",
  EMOTIONAL_PROSPERITY: "Emotional Prosperity",
  ENVIRONMENTAL_EQUITY: "Environmental Equity",
};

export const DIMENSION_COLORS: Record<string, string> = {
  SELF_SUSTAINABILITY: "bg-amber-100 text-amber-800 border-amber-300",
  EMOTIONAL_PROSPERITY: "bg-rose-100 text-rose-800 border-rose-300",
  ENVIRONMENTAL_EQUITY: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

const STATUS_COLORS: Record<string, string> = {
  verified: "bg-emerald-100 text-emerald-800",
  active: "bg-emerald-100 text-emerald-800",
  approved: "bg-emerald-100 text-emerald-800",
  completed: "bg-emerald-100 text-emerald-800",
  credible: "bg-emerald-100 text-emerald-800",
  published: "bg-sky-100 text-sky-800",
  pending: "bg-amber-100 text-amber-800",
  verification_pending: "bg-amber-100 text-amber-800",
  detected: "bg-sky-100 text-sky-800",
  review: "bg-amber-100 text-amber-800",
  inconclusive: "bg-amber-100 text-amber-800",
  under_review: "bg-amber-100 text-amber-800",
  open: "bg-amber-100 text-amber-800",
  draft: "bg-slate-100 text-slate-700",
  inventory: "bg-slate-100 text-slate-700",
  assigned: "bg-sky-100 text-sky-800",
  rejected: "bg-red-100 text-red-800",
  not_credible: "bg-red-100 text-red-800",
  revoked: "bg-red-100 text-red-800",
  suspended: "bg-red-100 text-red-800",
  lost: "bg-red-100 text-red-800",
  stolen: "bg-red-100 text-red-800",
  invalid: "bg-red-100 text-red-800",
  disputed: "bg-purple-100 text-purple-800",
  resolved: "bg-emerald-100 text-emerald-800",
};

export function Badge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function DimensionBadge({ dimension }: { dimension: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${DIMENSION_COLORS[dimension] ?? "bg-slate-100 text-slate-700 border-slate-300"}`}
    >
      {DIMENSION_LABELS[dimension] ?? dimension}
    </span>
  );
}

export function Card({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`glass p-5 ${className}`}>
      {title && (
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#86868b]">{title}</h3>
      )}
      {children}
    </div>
  );
}

export function Kpi({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="glass p-4">
      <div className={`text-2xl font-semibold tracking-tight ${accent ? "text-emerald-600" : "text-[#1d1d1f]"}`}>
        {value}
      </div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-[#86868b]">{label}</div>
    </div>
  );
}

export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="glass overflow-x-auto p-0">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-black/[0.06]">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#86868b]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.05]">{children}</tbody>
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
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/beaurity-overlay-small.png"
            alt="Beaurity"
            width={240}
            height={47}
            className="-my-2 h-9 w-auto"
          />
          <span className="hidden h-4 w-px bg-black/10 sm:block" />
          <span className="hidden text-xs font-normal text-[#86868b] sm:inline">{title}</span>
        </Link>
        <nav className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-[#1d1d1f]/80">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-[#0071e3]">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-[13px] text-[#86868b]">
          <form action={logoutAction}>
            <button className="rounded-full border border-black/10 px-3 py-1.5 text-xs text-[#1d1d1f] transition-colors hover:bg-black/[0.04]">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

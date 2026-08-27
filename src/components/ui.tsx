import Link from "next/link";
import type { ReactNode } from "react";
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
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {title && <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>}
      {children}
    </div>
  );
}

export function Kpi({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`text-2xl font-bold ${accent ? "text-emerald-700" : "text-slate-900"}`}>{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
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
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-emerald-800">
          JourneyPort<span className="text-slate-400">™</span>
          <span className="ml-2 text-xs font-medium text-slate-400">{title}</span>
        </Link>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-emerald-700">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm text-slate-500">
          {user && <span>{user.displayName}</span>}
          <form action={logoutAction}>
            <button className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

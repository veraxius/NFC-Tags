"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { logoutAction } from "@/lib/actions";
import { IconSidebarToggle } from "@/components/icons";

// Left sidebar navigation, shared by Partner, Ops, and Journey (each
// passes its own homeHref/title/links — no cross-area behavior changes).
// Fixed and open by default; a small toggle button sitting just outside
// the sidebar's top-right edge collapses it to an icon rail, and the
// choice sticks until toggled again (no hover behavior). The button
// slides with the sidebar's edge as it resizes, and its own icon shows
// the current open/closed state. On mobile it hands off to a fixed,
// horizontally-scrollable bottom icon tab bar.

const WIDTH_OPEN = 232;
const WIDTH_CLOSED = 76;

export function Sidebar({
  title,
  homeHref,
  links,
}: {
  title: string;
  homeHref: string;
  links: { href: string; label: string; icon: ReactNode }[];
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);
  const shortestHref = Math.min(...links.map((l) => l.href.length));

  const isActive = (href: string) =>
    href.length === shortestHref ? pathname === href : pathname.startsWith(href);

  const width = expanded ? WIDTH_OPEN : WIDTH_CLOSED;

  return (
    <>
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden flex-col overflow-x-hidden border-r border-[var(--color-divider)] bg-white/90 backdrop-blur transition-[width] duration-300 ease-out sm:flex print:hidden"
        style={{ width }}
      >
        <Link href={homeHref} className="flex shrink-0 items-center gap-2.5 overflow-hidden px-4 py-4">
          <Image
            src="/beaurity-imagen.png"
            alt="Beaurity"
            width={512}
            height={512}
            className="h-8 w-8 shrink-0"
          />
          <span
            className={`wordmark overflow-hidden whitespace-nowrap text-[18px] leading-none text-[var(--color-text)] transition-opacity duration-200 ${
              expanded ? "opacity-100" : "w-0 opacity-0"
            }`}
          >
            Beaurity
          </span>
        </Link>
        {expanded && (
          <p className="overflow-hidden whitespace-nowrap px-4 pb-3 text-xs text-[var(--color-text-secondary)]">
            {title}
          </p>
        )}

        <nav className="flex-1 space-y-1 overflow-x-hidden overflow-y-auto px-3 py-2">
          {links.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                title={!expanded ? l.label : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--color-pink-soft)] text-[var(--color-pink-ink)]"
                    : "text-[var(--color-text-secondary)] hover:bg-black/[0.04] hover:text-[var(--color-text)]"
                }`}
              >
                <span className="shrink-0">{l.icon}</span>
                <span
                  className={`overflow-hidden whitespace-nowrap transition-opacity duration-200 ${
                    expanded ? "opacity-100" : "w-0 opacity-0"
                  }`}
                >
                  {l.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-[var(--color-divider)] p-3">
          <form action={logoutAction}>
            <button className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-black/10 px-3 py-1.5 text-xs text-[var(--color-text)] transition-colors hover:bg-black/[0.04]">
              {expanded ? "Sign out" : "⎋"}
            </button>
          </form>
        </div>
      </aside>

      {/* Toggle button — fixed just outside the sidebar's top-right edge,
          sliding along with it. Same vertical position always; horizontal
          position tracks the sidebar's current width. */}
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        aria-pressed={expanded}
        className="fixed top-5 z-50 hidden h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border border-[var(--color-divider)] bg-white shadow-sm transition-[left] duration-300 ease-out hover:border-[var(--color-pink)] sm:flex print:hidden"
        style={{ left: width }}
      >
        <IconSidebarToggle open={expanded} />
      </button>

      {/* Mobile bottom tab bar — horizontally scrollable, not equally
          divided — safe for both a short list (Partner) and a long one
          (Ops' 12 sections) without squeezing tabs illegibly thin. */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex overflow-x-auto border-t border-[var(--color-divider)] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden print:hidden">
        {links.map((l) => {
          const active = isActive(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex min-w-[64px] flex-none flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-medium ${
                active ? "text-[var(--color-pink)]" : "text-[var(--color-text-secondary)]"
              }`}
            >
              {l.icon}
              <span className="whitespace-nowrap">{l.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Spacer so page content sits to the right of the sidebar — tracks
          the same persistent state, so collapsing genuinely reflows the
          page (this is a real toggle now, not a hover peek). */}
      <div
        className="hidden shrink-0 transition-[width] duration-300 ease-out sm:block print:hidden"
        style={{ width }}
        aria-hidden
      />
    </>
  );
}

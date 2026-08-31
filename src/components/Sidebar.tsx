"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { logoutAction } from "@/lib/actions";

// Left sidebar navigation for Partner only — Ops and Journey keep the
// top NavBar (components/ui.tsx) unchanged. Sits as a compact icon rail
// by default and expands on hover (overlaying the content, not pushing
// it), collapsing back the instant the cursor leaves. On mobile it hands
// off to a fixed bottom icon tab bar, same pattern as NavBar's
// mobileTabBar.

export function Sidebar({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string; icon: ReactNode }[];
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const shortestHref = Math.min(...links.map((l) => l.href.length));

  const isActive = (href: string) =>
    href.length === shortestHref ? pathname === href : pathname.startsWith(href);

  return (
    <>
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col overflow-x-hidden border-r border-[var(--color-divider)] bg-white/90 backdrop-blur transition-[width,box-shadow] duration-300 ease-out sm:flex ${
          expanded ? "w-[232px] shadow-2xl" : "w-[76px]"
        }`}
      >
        <Link href="/partner" className="flex shrink-0 items-center gap-2.5 overflow-hidden px-4 py-4">
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

      {/* Mobile bottom tab bar — same pattern as NavBar's mobileTabBar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-[var(--color-divider)] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        {links.map((l) => {
          const active = isActive(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                active ? "text-[var(--color-pink)]" : "text-[var(--color-text-secondary)]"
              }`}
            >
              {l.icon}
              <span className="truncate">{l.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Spacer so page content sits to the right of the sidebar's resting
          (collapsed) width — the hover-expand overlays the content instead
          of pushing it, so this never changes size. */}
      <div className="hidden w-[76px] shrink-0 sm:block" aria-hidden />
    </>
  );
}

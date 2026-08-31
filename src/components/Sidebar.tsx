"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { logoutAction } from "@/lib/actions";
import { IconChevronLeft } from "@/components/icons";

// Left sidebar navigation for Partner only — Ops and Journey keep the
// top NavBar (components/ui.tsx) unchanged. Collapses to an icon rail on
// desktop (smooth width transition) and hands off to a fixed bottom icon
// tab bar on mobile, same pattern as NavBar's mobileTabBar.

export function Sidebar({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string; icon: ReactNode }[];
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const shortestHref = Math.min(...links.map((l) => l.href.length));

  const isActive = (href: string) =>
    href.length === shortestHref ? pathname === href : pathname.startsWith(href);

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-[var(--color-divider)] bg-white/90 backdrop-blur transition-[width] duration-300 ease-out sm:flex ${
          collapsed ? "w-[76px]" : "w-[232px]"
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
            className={`wordmark whitespace-nowrap text-[18px] leading-none text-[var(--color-text)] transition-opacity duration-200 ${
              collapsed ? "w-0 opacity-0" : "opacity-100"
            }`}
          >
            Beaurity
          </span>
        </Link>
        {!collapsed && (
          <p className="px-4 pb-3 text-xs text-[var(--color-text-secondary)]">{title}</p>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {links.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                title={collapsed ? l.label : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--color-pink-soft)] text-[var(--color-pink-ink)]"
                    : "text-[var(--color-text-secondary)] hover:bg-black/[0.04] hover:text-[var(--color-text)]"
                }`}
              >
                <span className="shrink-0">{l.icon}</span>
                <span
                  className={`whitespace-nowrap transition-opacity duration-200 ${
                    collapsed ? "w-0 opacity-0" : "opacity-100"
                  }`}
                >
                  {l.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-2 border-t border-[var(--color-divider)] p-3">
          <button
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] text-[var(--color-text-secondary)] transition-colors hover:bg-black/[0.04]"
          >
            <IconChevronLeft className={`shrink-0 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} />
            <span className={`whitespace-nowrap transition-opacity duration-200 ${collapsed ? "w-0 opacity-0" : "opacity-100"}`}>
              Collapse
            </span>
          </button>
          <form action={logoutAction}>
            <button className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-black/10 px-3 py-1.5 text-xs text-[var(--color-text)] transition-colors hover:bg-black/[0.04]">
              {collapsed ? "⎋" : "Sign out"}
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

      {/* Spacer so page content sits to the right of the fixed sidebar,
          with the same smooth transition as the sidebar's own width. */}
      <div
        className={`hidden shrink-0 transition-[width] duration-300 ease-out sm:block ${
          collapsed ? "w-[76px]" : "w-[232px]"
        }`}
        aria-hidden
      />
    </>
  );
}

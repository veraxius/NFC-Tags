"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

const NAV = [
  { href: "#what", label: "EarthyDoing" },
  { href: "#what", label: "What it is" },
  { href: "#how", label: "How it works" },
  { href: "#organizations", label: "For organizations" },
  { href: "#trust", label: "Trust" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

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
            priority
            className="-my-2 h-8 w-8 sm:h-10 sm:w-10"
          />
          <span className="wordmark whitespace-nowrap text-[18px] leading-none text-[var(--color-text)] sm:text-[22px]">
            Beaurity
          </span>
        </Link>

        <nav className="ml-2 hidden gap-6 text-[14px] text-[var(--color-text)]/75 lg:flex">
          {NAV.map((n) => (
            <a key={n.label} href={n.href} className="transition-colors hover:text-[var(--color-pink)]">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden shrink-0 items-center gap-2 sm:flex">
          <Link href="/login" className="btn-secondary !py-2 !px-3 !text-[13px]">
            Sign in
          </Link>
          <Link href="/register" className="btn-primary !px-4 !py-2 !text-[13px]">
            Start your Journey
          </Link>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-divider)] sm:hidden"
        >
          <span className="sr-only">Menu</span>
          <div className="flex flex-col gap-1">
            <span className="block h-[1.5px] w-4 bg-[var(--color-text)]" />
            <span className="block h-[1.5px] w-4 bg-[var(--color-text)]" />
          </div>
        </button>
      </div>

      {open && (
        <div className="border-t border-[var(--color-divider)] px-4 py-4 sm:hidden">
          <nav className="flex flex-col gap-3 text-[15px] text-[var(--color-text)]">
            {NAV.map((n) => (
              <a key={n.label} href={n.href} onClick={() => setOpen(false)}>
                {n.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/login" className="btn-secondary !py-2 !text-[14px]">
              Sign in
            </Link>
            <Link href="/register" className="btn-primary !py-2.5 !text-[14px]">
              Start your Journey
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

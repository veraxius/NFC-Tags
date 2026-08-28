import Link from "next/link";
import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="border-t px-6 py-10" style={{ borderColor: "var(--color-divider)" }}>
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-2 opacity-80">
          <Image src="/beaurity-imagen.png" alt="Beaurity" width={512} height={512} className="h-6 w-6" />
          <span className="wordmark text-[17px] leading-none text-[var(--color-text)]">Beaurity</span>
        </div>
        <p className="mt-3 max-w-lg text-[12px] leading-[1.6] text-[var(--color-text-secondary)]">
          Beaurity JourneyPort™ — Your Trusted Journey Through Life.
        </p>

        <p className="mt-6 max-w-2xl text-[11px] leading-[1.6] text-[var(--color-warmgray-ink)]">
          &ldquo;Verified Impact&rdquo; refers to impact supported by
          verifiable evidence of participation, contribution, activity, and,
          where available, documented outcomes. Verification does not
          necessarily constitute independent auditing, scientific
          validation, or proof that a specific action directly caused every
          associated outcome.
        </p>

        <div
          className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t pt-4 text-[12px] text-[var(--color-text-secondary)]"
          style={{ borderColor: "var(--color-divider)" }}
        >
          <span>Copyright © {new Date().getFullYear()} Beaurity. All rights reserved.</span>
          <Link href="/login" className="hover:text-[var(--color-text)]">
            Sign in
          </Link>
          <Link href="/register" className="hover:text-[var(--color-text)]">
            Create account
          </Link>
        </div>
      </div>
    </footer>
  );
}

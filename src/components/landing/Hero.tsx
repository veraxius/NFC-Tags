import Link from "next/link";
import { Reveal } from "@/components/Reveal";

// 01 — HERO. The visitor's first breath: what this is, in one sentence,
// before anything else competes for attention.
export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-20 text-center sm:pt-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px]"
        style={{
          background:
            "radial-gradient(55% 45% at 28% 10%, rgba(230,0,126,0.10) 0%, transparent 60%)," +
            "radial-gradient(50% 40% at 78% 6%, rgba(255,194,14,0.12) 0%, transparent 60%)," +
            "radial-gradient(60% 45% at 50% 30%, rgba(142,215,198,0.16) 0%, transparent 65%)",
        }}
      />

      <Reveal>
        <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--color-pink)]">
          Beaurity EarthyDoing™
        </p>
      </Reveal>

      <Reveal delay={80}>
        <h1 className="wordmark mx-auto mt-5 max-w-4xl text-[42px] leading-[1.06] tracking-[-0.02em] text-[var(--color-text)] sm:text-[64px] lg:text-[76px]">
          Turn Good Intentions Into{" "}
          <span className="text-[var(--color-pink)]">Verified Impact.</span>
        </h1>
      </Reveal>

      <Reveal delay={160}>
        <div className="mx-auto mt-7 max-w-2xl space-y-3 text-[17px] leading-[1.6] text-[var(--color-text-secondary)] sm:text-[19px]">
          <p>
            Every day, people do things that make themselves, their
            communities, and the planet better. Most of those actions
            disappear.
          </p>
          <p className="font-medium text-[var(--color-text)]">
            EarthyDoing™ makes them count.
          </p>
        </div>
      </Reveal>

      <Reveal delay={220}>
        <p className="mx-auto mt-6 max-w-xl text-[15px] font-medium tracking-wide text-[var(--color-text-secondary)]">
          Volunteer. Teach. Mentor. Restore. Protect. Support. Learn. Lead.
        </p>
      </Reveal>

      <Reveal delay={260}>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-[1.6] text-[var(--color-text-secondary)]">
          With Beaurity JourneyPort™, meaningful actions become part of a
          trusted record of what you actually did — confirmed by the people
          and organizations who were there with you.
        </p>
      </Reveal>

      <Reveal delay={300}>
        <p className="wordmark mt-6 text-[17px] text-[var(--color-text)]">
          One action. One tap. One trusted journey.
        </p>
      </Reveal>

      <Reveal delay={360}>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link href="/register" className="btn-primary">
            Start your Journey
          </Link>
          <a href="#organizations" className="btn-secondary">
            Bring EarthyDoings to your organization
          </a>
        </div>
      </Reveal>

      <Reveal delay={420}>
        <div className="mx-auto mt-14 flex max-w-md flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[13px] font-medium">
          <span className="rounded-full border border-[var(--color-pink)]/30 bg-[var(--color-pink-soft)] px-3 py-1 text-[var(--color-pink-ink)]">
            Self
          </span>
          <span className="text-[var(--color-warmgray)]">+</span>
          <span className="rounded-full border border-[var(--color-peach)]/60 bg-[var(--color-peach-soft)] px-3 py-1 text-[var(--color-peach-ink)]">
            People
          </span>
          <span className="text-[var(--color-warmgray)]">+</span>
          <span className="rounded-full border border-[var(--color-mint)]/60 bg-[var(--color-mint-soft)] px-3 py-1 text-[var(--color-mint-ink)]">
            Planet
          </span>
          <span className="ml-1 text-[var(--color-text-secondary)]">— impact you can prove.</span>
        </div>
      </Reveal>
    </section>
  );
}

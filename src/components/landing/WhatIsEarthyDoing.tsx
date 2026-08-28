import { Reveal } from "@/components/Reveal";

// 02 — WHAT IS AN EARTHYDOING? Asymmetric two-column beat: the definition
// on the left, a loose, hand-scattered collage of real examples on the
// right — texture instead of another paragraph.
const EXAMPLES = [
  { text: "Volunteering at a food bank", tint: "peach" },
  { text: "Mentoring a student", tint: "pink" },
  { text: "Cleaning a beach", tint: "mint" },
  { text: "Planting trees", tint: "mint" },
  { text: "Learning CPR", tint: "pink" },
  { text: "Supporting a neighbor", tint: "peach" },
  { text: "Restoring a habitat", tint: "mint" },
  { text: "Teaching someone a skill", tint: "pink" },
] as const;

const TINT_CLASS: Record<string, string> = {
  pink: "border-[var(--color-pink)]/25 bg-[var(--color-pink-soft)] text-[var(--color-pink-ink)]",
  peach: "border-[var(--color-peach)]/50 bg-[var(--color-peach-soft)] text-[var(--color-peach-ink)]",
  mint: "border-[var(--color-mint)]/50 bg-[var(--color-mint-soft)] text-[var(--color-mint-ink)]",
};

const ROTATE = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2", "rotate-1", "-rotate-2", "rotate-2", "-rotate-1"];

export function WhatIsEarthyDoing() {
  return (
    <section id="what" className="px-6 py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-10">
        <div>
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--color-pink)]">
              What is an EarthyDoing?
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="wordmark mt-3 text-[34px] leading-[1.12] tracking-[-0.015em] text-[var(--color-text)] sm:text-[46px]">
              Small actions matter.
              <br />
              Meaningful actions add up.
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 max-w-md text-[17px] leading-[1.6] text-[var(--color-text-secondary)]">
              An EarthyDoing™ is a meaningful action that creates positive
              impact for yourself, other people, your community, or the
              planet.
            </p>
          </Reveal>
          <Reveal delay={220}>
            <p className="mt-4 max-w-md text-[17px] leading-[1.6] text-[var(--color-text-secondary)]">
              Every action may seem small on its own. Together, they tell a
              bigger story —{" "}
              <span className="font-medium text-[var(--color-text)]">
                your story of contribution.
              </span>
            </p>
          </Reveal>
          <Reveal delay={280}>
            <p className="wordmark mt-7 text-[19px] text-[var(--color-text)]">
              Good intentions matter. Actions matter more.
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {EXAMPLES.map((e, i) => (
            <Reveal key={e.text} delay={i * 60} className={i % 3 === 1 ? "sm:translate-y-4" : ""}>
              <div
                className={`rounded-2xl border px-4 py-4 text-[14px] font-medium leading-snug ${TINT_CLASS[e.tint]} ${ROTATE[i % ROTATE.length]} transition-transform hover:rotate-0`}
              >
                {e.text}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

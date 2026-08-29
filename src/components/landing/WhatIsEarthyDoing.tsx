import Image from "next/image";
import { Reveal } from "@/components/Reveal";

// 02 — WHAT IS AN EARTHYDOING? Asymmetric two-column beat: the definition
// on the left, the client's real photo grid of examples on the right —
// texture instead of another paragraph.
export function WhatIsEarthyDoing() {
  return (
    <section id="what" className="px-6 py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-10">
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

        <Reveal delay={120}>
          <Image
            src="/what-is-earthydoing.png"
            alt="Eight examples of an EarthyDoing: volunteering at a food bank, mentoring a student, cleaning a beach, planting trees, learning CPR, restoring a habitat, supporting a neighbor, teaching someone a skill."
            width={1536}
            height={1024}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="h-auto w-full rounded-[28px]"
          />
        </Reveal>
      </div>
    </section>
  );
}

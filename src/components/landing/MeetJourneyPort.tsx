import Image from "next/image";
import { Reveal } from "@/components/Reveal";

// 05 — MEET JOURNEYPORT. A quieter, more intimate beat: one strong
// pull-quote instead of a paragraph wall, next to the real product photo.
export function MeetJourneyPort() {
  return (
    <section className="px-6 py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
        <Reveal>
          <Image
            src="/journeyport-bracelet.png"
            alt="The Beaurity JourneyPort bracelet — your action, verified impact. Self, People, Planet."
            width={1536}
            height={1024}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="h-auto w-full rounded-[28px]"
          />
        </Reveal>

        <div>
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--color-pink)]">
              Meet JourneyPort™
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="wordmark mt-3 text-[34px] leading-[1.12] tracking-[-0.015em] text-[var(--color-text)] sm:text-[46px]">
              Your Impact Passport.
            </h2>
          </Reveal>

          <Reveal delay={140}>
            <blockquote className="wordmark mt-8 border-l-4 border-[var(--color-pink)] pl-5 text-[19px] leading-[1.5] text-[var(--color-text)] sm:text-[22px]">
              Your résumé records what you&apos;ve achieved.
              <br />
              Your Journey records what you&apos;ve contributed.
            </blockquote>
          </Reveal>

          <Reveal delay={200}>
            <p className="mt-8 max-w-md text-[16px] leading-[1.65] text-[var(--color-text-secondary)]">
              JourneyPort™ is a simple bracelet that connects you to
              everything you do. No searching. No paper forms. No
              complicated check-in process.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <p className="mt-4 max-w-md text-[16px] leading-[1.65] text-[var(--color-text-secondary)]">
              When you participate in an EarthyDoing, simply tap. Your
              JourneyPort connects the action to your Journey and helps
              create a trusted record of your participation.
            </p>
          </Reveal>

          <Reveal delay={300}>
            <p className="mt-7 text-[15px] font-medium text-[var(--color-text)]">
              One JourneyPort. Many organizations. Countless actions.
              <br />
              One evolving story of contribution.
            </p>
          </Reveal>

          <Reveal delay={340}>
            <p className="wordmark mt-6 text-[17px] text-[var(--color-pink)]">
              Wear what you stand for. Build what you&apos;ve done.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

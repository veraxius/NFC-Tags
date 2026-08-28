import Image from "next/image";
import { Reveal } from "@/components/Reveal";

// 05 — MEET JOURNEYPORT. A quieter, more intimate beat: one strong
// pull-quote instead of a paragraph wall, and a simple badge-style mark
// standing in for the bracelet until real product photography lands.
export function MeetJourneyPort() {
  return (
    <section className="px-6 py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
        <Reveal>
          <div className="mx-auto flex aspect-square w-full max-w-sm items-center justify-center">
            <div
              className="flex h-56 w-56 items-center justify-center rounded-full sm:h-72 sm:w-72"
              style={{
                background:
                  "radial-gradient(circle at 35% 30%, rgba(230,0,126,0.14), rgba(142,215,198,0.18) 55%, transparent 75%)",
              }}
            >
              <div className="glass flex h-32 w-32 items-center justify-center rounded-full p-6 sm:h-40 sm:w-40">
                <Image
                  src="/beaurity-imagen.png"
                  alt="JourneyPort"
                  width={512}
                  height={512}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          </div>
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
              JourneyPort™ is a simple NFC-enabled bracelet that connects you
              to the EarthyDoing ecosystem. No searching. No paper forms. No
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

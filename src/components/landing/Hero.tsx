import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/Reveal";

// 01 — HERO. The visitor's first breath. The client's finished banner
// graphic already carries the headline, the SELF/PEOPLE/PLANET mark and
// the tagline. It sits with a small margin from the edges and rounded
// corners, like every other image on the page. The text below it stays
// deliberately shorter than before: only what the image doesn't already
// say, plus the real, clickable CTAs an image can't provide.
export function Hero() {
  return (
    <section className="relative overflow-hidden pb-24 pt-2 text-center">
      <Reveal>
        <div className="mx-auto max-w-none px-1 sm:px-2">
          <Image
            src="/hero-verified-impact.png"
            alt="Turn Good Intentions Into Verified Impact. EarthyDoing makes every meaningful action count — Self, People, Planet."
            width={1536}
            height={1024}
            priority
            sizes="100vw"
            className="h-auto w-full rounded-[28px]"
          />
        </div>
      </Reveal>

      <div className="px-6 pt-14">
        <Reveal delay={80}>
          <div className="mx-auto max-w-2xl space-y-3 text-[17px] leading-[1.6] text-[var(--color-text-secondary)] sm:text-[19px]">
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

        <Reveal delay={140}>
          <p className="mx-auto mt-6 max-w-xl text-[15px] font-medium tracking-wide text-[var(--color-text-secondary)]">
            Volunteer. Teach. Mentor. Restore. Protect. Support. Learn. Lead.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-[1.6] text-[var(--color-text-secondary)]">
            With Beaurity JourneyPort™, meaningful actions become part of a
            trusted record of what you actually did — confirmed by the
            people and organizations who were there with you.
          </p>
        </Reveal>

        <Reveal delay={260}>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="btn-primary transition-transform duration-200 ease-out hover:scale-[1.04]"
            >
              Start your Journey
            </Link>
            <a
              href="#organizations"
              className="btn-secondary transition-transform duration-200 ease-out hover:scale-[1.04]"
            >
              Bring EarthyDoings to your organization
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

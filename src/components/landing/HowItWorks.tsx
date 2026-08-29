import Image from "next/image";
import { Reveal } from "@/components/Reveal";

// 06 — HOW IT WORKS. A vertical journey path — the strongest literal
// expression of "Journey" in the whole page. Steps alternate sides on
// desktop so the eye has to travel, not just scroll past a stack.
const STEPS = [
  {
    n: "01",
    label: "Tap",
    title: "Tap your JourneyPort at a participating EarthyDoing.",
    body: "Your Journey identity connects securely to the activity.",
    color: "var(--color-pink)",
  },
  {
    n: "02",
    label: "Do",
    title: "Participate.",
    body: "Volunteer. Learn. Restore. Mentor. Support. Protect. Contribute. The action matters more than the technology.",
    color: "var(--color-gold)",
  },
  {
    n: "03",
    label: "Verify",
    title: "What happened gets confirmed — not just claimed.",
    body: "Beaurity's AIM Trust Layer quietly checks that everything lines up, so every verified moment is one you can stand behind.",
    color: "var(--color-teal)",
  },
  {
    n: "04",
    label: "Grow",
    title: "Your verified EarthyDoing becomes part of your Journey.",
    body: "One action becomes ten. Ten become fifty. Over time, your Journey becomes a living record of contribution.",
    color: "var(--color-mint)",
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how" className="px-6 py-24 sm:py-32" style={{ background: "var(--color-bg-alt)" }}>
      <div className="mx-auto max-w-4xl text-center">
        <Reveal>
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--color-pink)]">
            How it works
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="wordmark mx-auto mt-3 max-w-2xl text-[34px] leading-[1.12] tracking-[-0.015em] text-[var(--color-text)] sm:text-[46px]">
            Tap. Do. Verify. Grow.
          </h2>
        </Reveal>
      </div>

      <Reveal delay={140}>
        <Image
          src="/how-it-works-tap.png"
          alt="Tap your Beaurity JourneyPort bracelet to record your action — every action counts, verified on your dashboard."
          width={1536}
          height={1024}
          sizes="(min-width: 1024px) 900px, 100vw"
          className="mx-auto mt-14 h-auto w-full max-w-4xl rounded-[28px]"
        />
      </Reveal>

      <div className="relative mx-auto mt-16 max-w-3xl">
        <div
          aria-hidden
          className="absolute left-6 top-2 bottom-2 w-[3px] rounded-full sm:left-1/2 sm:-translate-x-1/2"
          style={{
            background: "linear-gradient(180deg, var(--color-pink), var(--color-gold), var(--color-teal), var(--color-mint))",
            opacity: 0.35,
          }}
        />
        <div className="space-y-10">
          {STEPS.map((s, i) => {
            const alignRight = i % 2 === 1;
            return (
              <Reveal key={s.n} delay={i * 100}>
                <div
                  className={`relative flex items-start gap-5 pl-16 sm:pl-0 ${
                    alignRight ? "sm:flex-row-reverse sm:text-right" : ""
                  }`}
                >
                  <div
                    className="absolute left-0 top-0 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white sm:static"
                    style={{ background: s.color }}
                  >
                    {s.n}
                  </div>
                  <div className={`glass flex-1 p-5 sm:max-w-[46%] ${alignRight ? "sm:ml-auto" : "sm:mr-auto"}`}>
                    <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: s.color }}>
                      {s.label}
                    </p>
                    <h3 className="mt-1 text-[17px] font-semibold leading-snug text-[var(--color-text)]">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-[1.6] text-[var(--color-text-secondary)]">{s.body}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>

      <Reveal delay={460}>
        <p className="mx-auto mt-16 max-w-lg text-center text-[16px] leading-[1.6] text-[var(--color-text-secondary)]">
          Not what you say you care about.{" "}
          <span className="font-semibold text-[var(--color-text)]">What you actually did.</span>
        </p>
      </Reveal>
    </section>
  );
}

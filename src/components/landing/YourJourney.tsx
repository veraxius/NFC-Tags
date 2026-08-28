import { Reveal } from "@/components/Reveal";

// 07 — YOUR JOURNEY. A deliberately calm beat after the busier timeline —
// a simple, evenly-spaced grid. The pause the client asked for.
const ITEMS = [
  { title: "What you've done", body: "Every meaningful action you've taken, gathered in one place." },
  { title: "Confirmed, not just claimed", body: "Each moment backed by real confirmation — not only your word for it." },
  { title: "Time you've given", body: "Every hour you've shown up for something that mattered." },
  { title: "Who you've helped", body: "The communities and causes that felt your support." },
  { title: "Triple Impact", body: "How your actions touched Self, People, and Planet." },
  { title: "Milestones", body: "The moments worth celebrating along the way." },
] as const;

export function YourJourney() {
  return (
    <section className="px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl text-center">
        <Reveal>
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--color-pink)]">
            Your Journey
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="wordmark mx-auto mt-3 max-w-xl text-[34px] leading-[1.12] tracking-[-0.015em] text-[var(--color-text)] sm:text-[46px]">
            See your impact accumulate.
          </h2>
        </Reveal>
        <Reveal delay={140}>
          <p className="mx-auto mt-5 max-w-lg text-[16px] leading-[1.6] text-[var(--color-text-secondary)]">
            Positive actions should not disappear when an event ends. Your
            Journey brings them together.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-x-8 gap-y-10 text-left sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item, i) => (
            <Reveal key={item.title} delay={i * 70}>
              <div className="border-t-2 border-[var(--color-divider)] pt-4">
                <h3 className="text-[16px] font-semibold text-[var(--color-text)]">{item.title}</h3>
                <p className="mt-1.5 text-[14px] leading-[1.55] text-[var(--color-text-secondary)]">
                  {item.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={280}>
          <p className="wordmark mx-auto mt-16 max-w-md text-[19px] leading-[1.5] text-[var(--color-text)]">
            Your Journey grows with you — across organizations, causes,
            communities, and years.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

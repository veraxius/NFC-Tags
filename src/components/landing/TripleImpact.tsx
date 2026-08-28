import { Reveal } from "@/components/Reveal";

// 04 — TRIPLE IMPACT. The conceptual heart of the framework: three
// dimensions that overlap rather than compete. A hand-built Venn motif
// gives the idea a visual anchor instead of just three cards in a row.
const PILLARS = [
  {
    tag: "Self",
    title: "Self-Sustainability",
    line: "Build the capacity to thrive.",
    keywords: ["Knowledge", "Health", "Resilience", "Purpose", "Skills", "Independence"],
    color: "pink",
  },
  {
    tag: "People",
    title: "Emotional Prosperity",
    line: "Strengthen the human connections that make communities stronger.",
    keywords: ["Empathy", "Belonging", "Relationships", "Leadership", "Collaboration", "Community"],
    color: "peach",
  },
  {
    tag: "Planet",
    title: "Environmental Equity",
    line: "Protect and improve the world we share.",
    keywords: ["Conservation", "Regeneration", "Harm reduction", "Access", "Restoration", "Fairness"],
    color: "mint",
  },
] as const;

const COLOR_VAR: Record<string, string> = {
  pink: "var(--color-pink)",
  peach: "var(--color-peach)",
  mint: "var(--color-mint)",
};
const COLOR_SOFT: Record<string, string> = {
  pink: "var(--color-pink-soft)",
  peach: "var(--color-peach-soft)",
  mint: "var(--color-mint-soft)",
};
const COLOR_INK: Record<string, string> = {
  pink: "var(--color-pink-ink)",
  peach: "var(--color-peach-ink)",
  mint: "var(--color-mint-ink)",
};

function VennMotif() {
  return (
    <svg viewBox="0 0 320 260" className="mx-auto h-auto w-full max-w-[340px]" aria-hidden>
      <circle cx="130" cy="105" r="95" fill="var(--color-pink)" opacity="0.32" />
      <circle cx="190" cy="105" r="95" fill="var(--color-mint)" opacity="0.4" />
      <circle cx="160" cy="165" r="95" fill="var(--color-peach)" opacity="0.4" />
      <text x="72" y="70" fontSize="14" fontWeight="600" fill="var(--color-pink-ink)">Self</text>
      <text x="222" y="70" fontSize="14" fontWeight="600" fill="var(--color-mint-ink)">Planet</text>
      <text x="148" y="222" fontSize="14" fontWeight="600" fill="var(--color-peach-ink)">People</text>
    </svg>
  );
}

export function TripleImpact() {
  return (
    <section className="px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl text-center">
        <Reveal>
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--color-pink)]">
            Triple Impact
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="wordmark mx-auto mt-3 max-w-2xl text-[34px] leading-[1.12] tracking-[-0.015em] text-[var(--color-text)] sm:text-[46px]">
            Impact is bigger than carbon.
          </h2>
        </Reveal>
        <Reveal delay={140}>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-[1.6] text-[var(--color-text-secondary)]">
            Real sustainability starts with people. EarthyDoing examines
            positive action across three interconnected dimensions of impact.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-10 lg:grid-cols-[0.9fr_1.3fr] lg:items-center lg:text-left">
          <Reveal>
            <VennMotif />
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-3 lg:gap-4">
            {PILLARS.map((p, i) => (
              <Reveal key={p.tag} delay={i * 100}>
                <div
                  className="h-full rounded-[22px] border p-5 text-left"
                  style={{ borderColor: `${COLOR_VAR[p.color]}40`, background: COLOR_SOFT[p.color] }}
                >
                  <p
                    className="text-[12px] font-semibold uppercase tracking-wide"
                    style={{ color: COLOR_INK[p.color] }}
                  >
                    {p.tag}
                  </p>
                  <h3 className="mt-1 text-[17px] font-semibold tracking-tight text-[var(--color-text)]">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-[1.55] text-[var(--color-text-secondary)]">
                    {p.line}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.keywords.map((k) => (
                      <span
                        key={k}
                        className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-secondary)]"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={200}>
          <div className="mx-auto mt-16 max-w-xl">
            <p className="wordmark text-[19px] text-[var(--color-text)]">One action can impact all three.</p>
            <p className="mt-3 text-[15px] leading-[1.7] text-[var(--color-text-secondary)]">
              A beach cleanup protects the environment. It can also strengthen
              community. It can build knowledge. It can create belonging. It
              can inspire the next action.
            </p>
            <p className="mt-3 text-[15px] font-medium text-[var(--color-text)]">
              That is Triple Impact. Self + People + Planet.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

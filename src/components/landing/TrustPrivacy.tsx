import { Reveal } from "@/components/Reveal";

// 09 — TRUST, PRIVACY & AIM. The one deliberate, dramatic break in the
// whole page: a dark ground for a moment that asks to be taken seriously,
// before the page returns to light for the closing invitation.
const PRINCIPLES = [
  { title: "Consent", body: "You should understand when and why your information is being used." },
  { title: "Transparency", body: "Verification should be explainable." },
  { title: "Control", body: "Your Journey belongs to you." },
  { title: "Privacy", body: "Organizations should only access what's necessary for participation and verification." },
  { title: "Accountability", body: "Verified actions should have evidence behind them." },
  { title: "Challenge", body: "Incorrect information should be correctable, and disputed evidence reviewable." },
] as const;

export function TrustPrivacy() {
  return (
    <section
      id="trust"
      className="px-6 py-24 sm:py-32"
      style={{ background: "linear-gradient(160deg, #241033 0%, #1a0c26 55%, #150920 100%)" }}
    >
      <div className="mx-auto max-w-4xl text-center">
        <Reveal>
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--color-mint)" }}>
            Trust, privacy & AIM
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="wordmark mx-auto mt-3 max-w-2xl text-[32px] leading-[1.15] tracking-[-0.015em] text-white sm:text-[44px]">
            We don&apos;t score people.
            <br />
            We verify evidence.
          </h2>
        </Reveal>

        <Reveal delay={160}>
          <div className="mx-auto mt-9 max-w-xl space-y-3 text-[15.5px] leading-[1.7] text-white/70">
            <p>EarthyDoing is built around a simple principle: trust should never require blind faith.</p>
            <p>
              JourneyPort helps establish that an activity occurred.
              Participating organizations provide confirmation. Evidence
              creates signals. Beaurity&apos;s AIM Trust Layer evaluates the
              credibility of those signals — the result is an explainable
              record behind a verified EarthyDoing.
            </p>
          </div>
        </Reveal>

        <Reveal delay={220}>
          <p className="mx-auto mt-8 max-w-md text-[17px] font-medium text-white">
            But there is a line we will not cross: people are not trust
            scores. EarthyDoing does not exist to rank people according to
            how &ldquo;good&rdquo; they are — it exists to strengthen the
            credibility of meaningful actions.
          </p>
        </Reveal>
      </div>

      <Reveal delay={260}>
        <p className="wordmark mx-auto mt-20 max-w-md text-center text-[19px] text-white">
          Your Journey. Your data. Your choice.
        </p>
      </Reveal>

      <div className="mx-auto mt-10 grid max-w-4xl gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {PRINCIPLES.map((p, i) => (
          <Reveal key={p.title} delay={i * 70}>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
              <h3 className="text-[15px] font-semibold" style={{ color: "var(--color-mint)" }}>
                {p.title}
              </h3>
              <p className="mt-1.5 text-[13.5px] leading-[1.55] text-white/65">{p.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={500}>
        <p className="wordmark mx-auto mt-16 max-w-xs text-center text-[16px] text-white/80">
          Trust must be earned. Including ours.
        </p>
      </Reveal>
    </section>
  );
}

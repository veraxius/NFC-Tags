import Link from "next/link";
import { getSessionUser, isBeaurityAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Reveal } from "@/components/Reveal";

const DIMENSIONS = [
  {
    key: "SELF_SUSTAINABILITY",
    name: "Self-Sustainability",
    desc: "Personal growth, knowledge, health, resilience, purpose, independence, and wellbeing.",
    tint: "#f5a623",
  },
  {
    key: "EMOTIONAL_PROSPERITY",
    name: "Emotional Prosperity",
    desc: "Relationships, empathy, belonging, leadership, community, and human connection.",
    tint: "#ff5c73",
  },
  {
    key: "ENVIRONMENTAL_EQUITY",
    name: "Environmental Equity",
    desc: "Environmental protection, regeneration, harm reduction, access, and environmental fairness.",
    tint: "#34c759",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Tap your JourneyPort",
    desc: "A quick NFC tap at an Earthy Doing identifies you — nothing to type, nothing to carry but the tag itself.",
  },
  {
    n: "02",
    title: "The partner confirms it",
    desc: "The organization running the activity verifies your participation, attaching the evidence behind the moment.",
  },
  {
    n: "03",
    title: "AIM evaluates the evidence",
    desc: "The AIM Trust Layer reviews the signals and produces a credibility assessment — explainable, never a guess.",
  },
  {
    n: "04",
    title: "Your Journey grows",
    desc: "A verified Milestone joins your timeline, with a full chain of evidence you can inspect at any time.",
  },
];

export default async function Home() {
  const user = await getSessionUser();
  if (user) {
    if (isBeaurityAdmin(user)) redirect("/ops");
    if (user.partnerRoles.length > 0) redirect("/partner");
    redirect("/journey");
  }

  return (
    <main>
      {/* Nav */}
      <header className="glass-nav sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3.5">
          <Link href="/" className="text-[15px] font-semibold tracking-tight text-[#1d1d1f]">
            JourneyPort<span className="text-[#86868b]">™</span>
          </Link>
          <nav className="ml-2 hidden gap-6 text-[13px] text-[#1d1d1f]/80 sm:flex">
            <a href="#impact" className="transition-colors hover:text-[#0071e3]">Triple Impact</a>
            <a href="#how" className="transition-colors hover:text-[#0071e3]">How it works</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="btn-secondary !py-2 !text-[13px]">
              Sign in
            </Link>
            <Link href="/register" className="btn-primary !px-4 !py-2 !text-[13px]">
              Start your Journey
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-20 pt-24 text-center sm:pt-32">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px]"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, rgba(0,113,227,0.10) 0%, rgba(52,199,89,0.06) 45%, rgba(245,245,247,0) 80%)",
          }}
        />
        <Reveal>
          <p className="text-sm font-medium tracking-wide text-[#86868b]">
            Beaurity EarthyDoing™
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h1
            className="mx-auto mt-3 max-w-4xl text-[52px] font-semibold leading-[1.05] tracking-[-0.025em] text-[#1d1d1f] sm:text-[80px]"
          >
            JourneyPort.
            <br />
            <span style={{ color: "var(--color-accent)" }}>Record. Verify. Grow.</span>
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <p className="mx-auto mt-6 max-w-2xl text-[19px] leading-[1.5] text-[#86868b] sm:text-[21px]">
            Every meaningful action becomes part of your trusted Journey —
            verified through NFC, partner confirmation, and the AIM Trust Layer.
          </p>
        </Reveal>
        <Reveal delay={240}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            <Link href="/register" className="btn-primary">
              Start your Journey
            </Link>
            <Link href="/login" className="btn-secondary">
              Sign in&nbsp;›
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Product visual */}
      <Reveal>
        <section className="px-6">
          <div className="mx-auto max-w-5xl">
            <div
              className="glass flex h-[280px] items-center justify-center overflow-hidden sm:h-[380px]"
              style={{
                borderRadius: "var(--radius-lg)",
                background:
                  "linear-gradient(155deg, rgba(0,113,227,0.10), rgba(52,199,89,0.08) 55%, rgba(255,255,255,0.6))",
              }}
            >
              <div className="text-center">
                <div className="mx-auto flex h-20 w-32 items-center justify-center rounded-2xl border border-white/60 bg-white/70 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-md">
                  <span className="text-2xl">📡</span>
                </div>
                <p className="mt-5 text-[13px] font-medium uppercase tracking-widest text-[#86868b]">
                  Tap. Verify. Trust.
                </p>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Triple Impact */}
      <section id="impact" className="px-6 py-24 sm:py-36">
        <div className="mx-auto max-w-5xl text-center">
          <Reveal>
            <p className="text-sm font-medium tracking-wide text-[#0071e3]">Triple Impact</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-2 text-[36px] font-semibold tracking-[-0.02em] text-[#1d1d1f] sm:text-[48px]">
              Every action, measured with purpose.
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="mx-auto mt-4 max-w-2xl text-[19px] leading-[1.5] text-[#86868b]">
              JourneyPort classifies verified Earthy Doings across three
              dimensions — never ranking people, only the credibility of what
              they did.
            </p>
          </Reveal>

          <div className="mt-16 grid gap-6 sm:grid-cols-3">
            {DIMENSIONS.map((d, i) => (
              <Reveal key={d.key} delay={i * 100}>
                <div className="glass h-full p-8 text-left">
                  <div
                    className="mb-6 h-2.5 w-2.5 rounded-full"
                    style={{ background: d.tint }}
                  />
                  <h3 className="text-[21px] font-semibold tracking-tight text-[#1d1d1f]">
                    {d.name}
                  </h3>
                  <p className="mt-3 text-[15px] leading-[1.5] text-[#86868b]">
                    {d.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="px-6 py-24 sm:py-36" style={{ background: "var(--color-bg-alt)" }}>
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <Reveal>
              <p className="text-sm font-medium tracking-wide text-[#0071e3]">How it works</p>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-2 text-[36px] font-semibold tracking-[-0.02em] text-[#1d1d1f] sm:text-[48px]">
                From a real moment to a trusted record.
              </h2>
            </Reveal>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 100}>
                <div className="glass flex h-full items-start gap-5 p-8">
                  <span className="text-[28px] font-semibold tracking-tight text-[#0071e3]/30">
                    {s.n}
                  </span>
                  <div>
                    <h3 className="text-[19px] font-semibold tracking-tight text-[#1d1d1f]">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-[1.5] text-[#86868b]">
                      {s.desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center sm:py-32">
        <Reveal>
          <h2 className="text-[36px] font-semibold tracking-[-0.02em] text-[#1d1d1f] sm:text-[48px]">
            Your Trusted Journey Through Life.
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <p className="mx-auto mt-4 max-w-xl text-[19px] text-[#86868b]">
            Create your Journey identity in under a minute.
          </p>
        </Reveal>
        <Reveal delay={180}>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            <Link href="/register" className="btn-primary">
              Start your Journey
            </Link>
            <Link href="/login" className="btn-secondary">
              Sign in&nbsp;›
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-10" style={{ borderColor: "var(--color-divider)" }}>
        <div className="mx-auto max-w-6xl">
          <p className="text-[12px] leading-[1.6] text-[#86868b]">
            Beaurity JourneyPort™ — Your Trusted Journey Through Life.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t pt-4 text-[12px] text-[#86868b]" style={{ borderColor: "var(--color-divider)" }}>
            <span>Copyright © {new Date().getFullYear()} Beaurity. All rights reserved.</span>
            <Link href="/login" className="hover:text-[#1d1d1f]">Sign in</Link>
            <Link href="/register" className="hover:text-[#1d1d1f]">Create account</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

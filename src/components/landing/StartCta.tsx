import Link from "next/link";
import { Reveal } from "@/components/Reveal";

// 10 — START. Closing invitation: the poetic list flows as wrapped tags
// rather than bullets, and the dual CTA mirrors the hero's structure —
// a deliberate bookend so the page feels like it arrives somewhere.
const ACTIONS = [
  "Help one person.",
  "Learn one skill.",
  "Volunteer one hour.",
  "Restore one place.",
  "Support one community.",
  "Protect something worth protecting.",
];

const PARTNER_CONTACT = "mailto:hello@beaurity.com?subject=Becoming%20an%20EarthyDoing%20Partner";

export function StartCta() {
  return (
    <section className="px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <h2 className="wordmark text-[34px] leading-[1.14] tracking-[-0.015em] text-[var(--color-text)] sm:text-[48px]">
            What will your next EarthyDoing be?
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <p className="mx-auto mt-5 max-w-md text-[16px] text-[var(--color-text-secondary)]">
            You don&apos;t need to change the world today.
          </p>
        </Reveal>

        <Reveal delay={160}>
          <div className="mx-auto mt-7 flex max-w-xl flex-wrap items-center justify-center gap-2.5">
            {ACTIONS.map((a) => (
              <span
                key={a}
                className="rounded-full border border-[var(--color-divider)] bg-white px-3.5 py-1.5 text-[13.5px] font-medium text-[var(--color-text)]"
              >
                {a}
              </span>
            ))}
          </div>
        </Reveal>

        <Reveal delay={220}>
          <p className="mx-auto mt-8 max-w-sm text-[15px] leading-[1.6] text-[var(--color-text-secondary)]">
            Then do it again. Every EarthyDoing becomes another piece of a
            larger story — a story built through action.
          </p>
        </Reveal>
      </div>

      <div className="mx-auto mt-16 grid max-w-4xl gap-5 sm:grid-cols-2">
        <Reveal delay={280}>
          <div
            className="glass flex h-full flex-col p-8 text-center"
            style={{
              background: "linear-gradient(160deg, #241033 0%, #1a0c26 55%, #150920 100%)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "none",
              WebkitBackdropFilter: "none",
            }}
          >
            <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-mint)" }}>
              For individuals
            </p>
            <h3 className="wordmark mt-2 text-[21px] text-white">
              Start building your Journey
              <br />
              today.
            </h3>
            <p className="mt-2 text-[14px] leading-[1.55] text-white/70">
              Create your Journey identity and begin turning meaningful
              actions into a trusted record of contribution.
            </p>
            <Link
              href="/register"
              className="btn-primary mt-auto inline-flex self-center transition-transform duration-200 ease-out hover:scale-[1.04]"
            >
              Start my Journey
            </Link>
          </div>
        </Reveal>
        <Reveal delay={340}>
          <div
            className="glass h-full p-8 text-center"
            style={{
              background: "linear-gradient(160deg, #241033 0%, #1a0c26 55%, #150920 100%)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "none",
              WebkitBackdropFilter: "none",
            }}
          >
            <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-mint)" }}>
              For organizations
            </p>
            <h3 className="wordmark mt-2 text-[21px] text-white">
              Turn your impact into trusted evidence.
            </h3>
            <p className="mt-2 text-[14px] leading-[1.55] text-white/70">
              Bring EarthyDoing and JourneyPort to your volunteers, members,
              programs, events, and communities.
            </p>
            <a
              href={PARTNER_CONTACT}
              className="btn-primary mt-6 inline-flex transition-transform duration-200 ease-out hover:scale-[1.04]"
            >
              Become an EarthyDoing Partner
            </a>
          </div>
        </Reveal>
      </div>

      <Reveal delay={400}>
        <div className="mx-auto mt-24 max-w-lg text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-secondary)]">
            The Beaurity Promise
          </p>
          <p className="wordmark mt-4 text-[19px] leading-[1.55] text-[var(--color-text)]">
            Good intentions inspire. Actions create change. Evidence builds
            trust.
          </p>
          <p className="mt-3 text-[15px] text-[var(--color-text-secondary)]">
            EarthyDoing™ makes every meaningful action count.
          </p>
          <p className="mt-4 text-[13px] font-medium uppercase tracking-wide text-[var(--color-pink)]">
            Self · People · Planet — one action at a time.
          </p>
        </div>
      </Reveal>
    </section>
  );
}

import Image from "next/image";
import { Reveal } from "@/components/Reveal";

// 03 — SEE EARTHYDOINGS IN ACTION. Full-width gallery beat — a deliberate
// rhythm break from the two-column section before it.
const ITEMS = [
  {
    verb: "Restore",
    title: "Beach Cleanup",
    body: "Join a community cleanup. Tap your JourneyPort. Participate. The organizing partner confirms your contribution — your environmental action becomes part of your Journey.",
    tint: "mint",
  },
  {
    verb: "Support",
    title: "Community Food Bank",
    body: "Give your time to help families in your community. Your participation becomes verified evidence of service and human connection.",
    tint: "peach",
  },
  {
    verb: "Grow",
    title: "Mentoring a Student",
    body: "Share knowledge. Build confidence. Help someone move forward. The impact reaches beyond the hours you contributed.",
    tint: "pink",
  },
  {
    verb: "Learn",
    title: "Sustainability Workshop",
    body: "Build knowledge that helps you make better decisions for yourself, your community, and the environment. Personal growth becomes part of impact too.",
    tint: "pink",
  },
  {
    verb: "Protect",
    title: "Habitat Restoration",
    body: "Help restore ecosystems and protect biodiversity. Your contribution becomes part of a larger environmental effort.",
    tint: "mint",
  },
  {
    verb: "Connect",
    title: "Community Service",
    body: "Support neighbors, organizations, and causes that strengthen communities — because impact is not only environmental. It is human.",
    tint: "peach",
  },
] as const;

const TINT = {
  mint: { dot: "bg-[var(--color-mint)]", label: "text-[var(--color-mint-ink)]" },
  peach: { dot: "bg-[var(--color-peach)]", label: "text-[var(--color-peach-ink)]" },
  pink: { dot: "bg-[var(--color-pink)]", label: "text-[var(--color-pink-ink)]" },
} as const;

export function InAction() {
  return (
    <section className="px-6 py-24 sm:py-32" style={{ background: "var(--color-bg-alt)" }}>
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--color-pink)]">
              See EarthyDoings in action
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="wordmark mx-auto mt-3 max-w-2xl text-[34px] leading-[1.12] tracking-[-0.015em] text-[var(--color-text)] sm:text-[46px]">
              Impact happens everywhere.
            </h2>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <Image
            src="/in-action-hub.png"
            alt="Six ways impact happens: Restore (Beach Cleanup), Grow (Mentoring a Student), Support (Community Food Bank), Learn (Sustainability Workshop), Protect (Habitat Restoration), Connect (Community Service)."
            width={1536}
            height={1024}
            sizes="100vw"
            className="mx-auto mt-14 h-auto w-full max-w-4xl rounded-[28px]"
          />
        </Reveal>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item, i) => (
            <Reveal key={item.title} delay={i * 90} className={i % 2 === 1 ? "lg:translate-y-6" : ""}>
              <div className="glass h-full p-7">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${TINT[item.tint].dot}`} />
                  <span className={`text-[12px] font-semibold uppercase tracking-wide ${TINT[item.tint].label}`}>
                    {item.verb}
                  </span>
                </div>
                <h3 className="mt-3 text-[19px] font-semibold tracking-tight text-[var(--color-text)]">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-[14.5px] leading-[1.6] text-[var(--color-text-secondary)]">
                  {item.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

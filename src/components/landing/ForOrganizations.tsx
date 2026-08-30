import Image from "next/image";
import { Reveal } from "@/components/Reveal";

// 08 — FOR ORGANIZATIONS. The audience shifts from individual to
// institution, so the section itself shifts — a warm tinted ground marks
// the change before a single word is read.
const BENEFITS = [
  { title: "Verify Participation", body: "Create stronger evidence that activities actually happened." },
  { title: "Measure Engagement", body: "Understand how people participate across initiatives." },
  { title: "Recognize Contributors", body: "Give volunteers and participants meaningful recognition they can carry with them." },
  { title: "Demonstrate Impact", body: "Turn everyday activity into a story your partners, donors, and community can see clearly." },
  { title: "Strengthen Reporting", body: "Give your reporting, grants, and partnerships the kind of records that hold up." },
  { title: "Increase Re-engagement", body: "Give people a reason to return, participate again, and continue their Journey." },
  { title: "Build Trust", body: "Make sure there's always a clear, honest trail behind every bit of impact you claim." },
] as const;

// Placeholder — the client will provide the real intake channel for
// organization inquiries; wire this to it before launch.
const PARTNER_CONTACT = "mailto:hello@beaurity.com?subject=Bringing%20EarthyDoing%20to%20our%20organization";

export function ForOrganizations() {
  return (
    <section
      id="organizations"
      className="px-6 py-24 sm:py-32"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,209,179,0.16), rgba(255,209,179,0.04) 60%, transparent)",
      }}
    >
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--color-peach-ink)]">
              For organizations
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="wordmark mx-auto mt-3 max-w-2xl text-[34px] leading-[1.12] tracking-[-0.015em] text-[var(--color-text)] sm:text-[46px]">
              Turn participation into evidence.
            </h2>
          </Reveal>
          <Reveal delay={140}>
            <p className="mx-auto mt-5 max-w-xl text-[17px] leading-[1.6] text-[var(--color-text-secondary)]">
              You already create impact. EarthyDoing helps you make it
              visible — for nonprofits, NGOs, schools, community
              organizations, volunteer groups, foundations, and
              purpose-driven organizations of every size.
            </p>
          </Reveal>
        </div>

        <Reveal delay={200}>
          <Image
            src="/for-organizations-field.png"
            alt="Beaurity EarthyDoing volunteers using the JourneyPort app in the field, recording a verified Tree Planting EarthyDoing."
            width={1536}
            height={1024}
            sizes="(min-width: 1024px) 900px, 100vw"
            className="mx-auto mt-14 h-auto w-full max-w-4xl rounded-[28px]"
          />
        </Reveal>

        <div className="mt-14 grid gap-x-8 gap-y-8 sm:grid-cols-2">
          {BENEFITS.map((b, i) => (
            <Reveal key={b.title} delay={i * 60}>
              <div className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--color-peach)]" />
                <div>
                  <h3 className="text-[16px] font-semibold text-[var(--color-text)]">{b.title}</h3>
                  <p className="mt-1 text-[14.5px] leading-[1.55] text-[var(--color-text-secondary)]">
                    {b.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={220}>
          <div className="mt-16 text-center">
            <p className="wordmark text-[19px] text-[var(--color-text)]">
              You create the impact. EarthyDoing helps you prove it.
            </p>
            <a
              href={PARTNER_CONTACT}
              className="btn-primary mt-6 inline-flex transition-transform duration-200 ease-out hover:scale-[1.04]"
            >
              Bring EarthyDoings to your organization
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

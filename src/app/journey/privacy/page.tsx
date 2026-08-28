import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { setVisibilityAction, setConsentAction } from "@/lib/actions";
import { OrganicCard, StatusPill, Headline } from "@/components/organic";

export const dynamic = "force-dynamic";

const CONSENT_LABELS: Record<string, string> = {
  terms: "Terms of Service",
  data_processing: "Using what I do here to build my Journey",
  location: "Recording where I was, when relevant",
  partner_sharing: "Sharing verified milestones with the organizations I join",
};

export default async function PrivacyPage() {
  const user = await requireUser();
  const [identity, consents] = await Promise.all([
    db.journeyIdentity.findUniqueOrThrow({ where: { userId: user.id } }),
    db.consent.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);

  // Latest state per consent type (history is append-only)
  const latest = new Map<string, (typeof consents)[number]>();
  for (const c of consents) if (!latest.has(c.consentType)) latest.set(c.consentType, c);

  return (
    <div className="space-y-6">
      <div>
        <Headline className="text-3xl">Privacy</Headline>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Your Journey, on your terms — you decide who sees it and what we collect.
        </p>
      </div>

      <OrganicCard className="p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Who can see your Journey
        </h2>
        <div className="flex flex-wrap gap-2">
          {["private", "partners", "public"].map((v) => {
            const set = setVisibilityAction.bind(null, v);
            const current = identity.profileVisibility === v;
            return (
              <form key={v} action={set}>
                <button
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                    current
                      ? "border-[var(--color-pink)] bg-[var(--color-pink)] text-white"
                      : "border-[var(--color-warmgray)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-alt)]"
                  }`}
                >
                  {v === "private" ? "Just me" : v === "partners" ? "Organizations I join" : "Everyone"}
                </button>
              </form>
            );
          })}
        </div>
      </OrganicCard>

      <OrganicCard className="p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          What you&apos;ve agreed to
        </h2>
        <div className="space-y-3">
          {["data_processing", "location", "partner_sharing"].map((type) => {
            const c = latest.get(type);
            const granted = c?.granted ?? false;
            const toggle = setConsentAction.bind(null, type, !granted);
            return (
              <div
                key={type}
                className="flex items-center justify-between gap-3 border-b border-[var(--color-divider)] pb-3 last:border-0 last:pb-0"
              >
                <p className="text-sm font-medium text-[var(--color-text)]">{CONSENT_LABELS[type]}</p>
                <form action={toggle}>
                  <button
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      granted
                        ? "bg-[var(--color-mint-soft)] text-[var(--color-mint-ink)] hover:bg-[var(--color-mint)]/25"
                        : "bg-[var(--color-warmgray-soft)] text-[var(--color-text-secondary)] hover:bg-[var(--color-warmgray)]/30"
                    }`}
                  >
                    {granted ? "Yes — turn off" : "Not yet — turn on"}
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      </OrganicCard>

      <OrganicCard className="p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          History
        </h2>
        <ul className="space-y-1.5 text-xs text-[var(--color-text-secondary)]">
          {consents.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <StatusPill status={c.granted ? "active" : "revoked"} />
              <span className="font-medium">{CONSENT_LABELS[c.consentType] ?? c.consentType}</span>
              <span className="text-[var(--color-warmgray)]">{c.createdAt.toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      </OrganicCard>
    </div>
  );
}

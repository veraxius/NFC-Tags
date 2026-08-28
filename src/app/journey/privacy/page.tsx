import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Card, Badge } from "@/components/ui";
import { setVisibilityAction, setConsentAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

const CONSENT_LABELS: Record<string, string> = {
  terms: "Terms of Service",
  data_processing: "Participation data processing",
  location: "Location evidence capture",
  partner_sharing: "Share verified milestones with partners",
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
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Privacy & Consent</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          You control your Journey&apos;s visibility and what JourneyPort may collect.
        </p>
      </div>

      <Card title="Journey visibility">
        <div className="flex flex-wrap gap-2">
          {["private", "partners", "public"].map((v) => {
            const set = setVisibilityAction.bind(null, v);
            const current = identity.profileVisibility === v;
            return (
              <form key={v} action={set}>
                <button
                  className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                    current
                      ? "border-[var(--color-pink)] bg-[var(--color-pink)] text-white"
                      : "border-[var(--color-warmgray)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-alt)]"
                  }`}
                >
                  {v === "private" ? "Private (only me)" : v === "partners" ? "Partners I join" : "Public"}
                </button>
              </form>
            );
          })}
        </div>
      </Card>

      <Card title="Consents">
        <div className="space-y-3">
          {["data_processing", "location", "partner_sharing"].map((type) => {
            const c = latest.get(type);
            const granted = c?.granted ?? false;
            const toggle = setConsentAction.bind(null, type, !granted);
            return (
              <div key={type} className="flex items-center justify-between gap-3 border-b border-[var(--color-divider)] pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{CONSENT_LABELS[type]}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {c ? `v${c.policyVersion} · ${c.createdAt.toLocaleDateString()}` : "Not yet set"}
                  </p>
                </div>
                <form action={toggle}>
                  <button
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      granted
                        ? "bg-[var(--color-mint-soft)] text-[var(--color-mint-ink)] hover:bg-[var(--color-mint)]/25"
                        : "bg-[var(--color-warmgray-soft)] text-[var(--color-text-secondary)] hover:bg-[var(--color-warmgray)]/30"
                    }`}
                  >
                    {granted ? "Granted — revoke" : "Not granted — grant"}
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Consent history (append-only)">
        <ul className="space-y-1.5 text-xs text-[var(--color-text-secondary)]">
          {consents.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <Badge status={c.granted ? "active" : "revoked"} />
              <span className="font-medium">{CONSENT_LABELS[c.consentType] ?? c.consentType}</span>
              <span className="text-[var(--color-warmgray)]">
                v{c.policyVersion} · {c.createdAt.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

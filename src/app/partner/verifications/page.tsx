import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { resolvePartnerFor } from "@/lib/partner";
import { OrganicCard, StatusPill, Headline } from "@/components/organic";
import {
  completeParticipationAction,
  approveVerificationAction,
  rejectVerificationAction,
} from "@/lib/actions";

export const dynamic = "force-dynamic";

// Partner verification workflow (US-004):
// 1) mark participation completed  2) approve/reject the pending verification.
export default async function PartnerVerifications() {
  const user = await requireUser();
  const partner = await resolvePartnerFor(user);

  const [inProgress, verifications] = await Promise.all([
    db.participation.findMany({
      where: { partnerId: partner.id, status: { in: ["detected", "in_progress"] } },
      include: { user: true, earthyDoing: true },
      orderBy: { checkInAt: "desc" },
    }),
    db.verification.findMany({
      where: { partnerId: partner.id },
      include: {
        participation: { include: { user: true, earthyDoing: true } },
        evidence: true,
        aimAssessment: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const pending = verifications.filter((v) => ["pending", "review"].includes(v.status));
  const done = verifications.filter((v) => !["pending", "review"].includes(v.status));

  return (
    <div className="space-y-8">
      <div>
        <Headline className="text-3xl">Confirmations</Headline>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Turn what happened into someone&apos;s verified Journey.
        </p>
      </div>

      <OrganicCard className="p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          1 · Checked in — wrap them up
        </h2>
        {inProgress.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">No one&apos;s waiting on this right now.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-divider)]">
            {inProgress.map((p) => {
              const complete = completeParticipationAction.bind(null, p.id);
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">{p.user.displayName}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {p.earthyDoing.title} · tapped in at {p.checkInAt.toLocaleTimeString()}
                    </p>
                  </div>
                  <form action={complete}>
                    <button className="rounded-full bg-[var(--color-pink)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-pink-hover)]">
                      Mark as done
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </OrganicCard>

      <OrganicCard className="p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          2 · Ready to confirm
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">Nothing waiting on your confirmation.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-divider)]">
            {pending.map((v) => {
              const approve = approveVerificationAction.bind(null, v.id, undefined);
              const reject = rejectVerificationAction.bind(null, v.id, "PARTNER_REJECTED");
              const tapped = v.evidence.some((e) => e.evidenceType === "nfc_tap");
              return (
                <li key={v.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        {v.participation.user.displayName}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {v.participation.earthyDoing.title} · {v.participation.checkInAt.toLocaleString()}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        <StatusPill status={v.status} />
                        {tapped && (
                          <span className="rounded-full bg-[var(--color-teal-soft)] px-2 py-0.5 text-[var(--color-teal-ink)]">
                            ✓ Tapped in
                          </span>
                        )}
                        {v.aimAssessment && (
                          <span
                            className={`rounded-full px-2 py-0.5 ${
                              v.aimAssessment.assessmentResult === "credible"
                                ? "bg-[var(--color-mint-soft)] text-[var(--color-mint-ink)]"
                                : "bg-[var(--color-gold-soft)] text-[var(--color-gold-ink)]"
                            }`}
                          >
                            {v.aimAssessment.assessmentResult === "credible"
                              ? "✓ Checks out"
                              : "⚠ Worth a second look"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <form action={approve}>
                        <button className="rounded-full bg-[var(--color-pink)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-pink-hover)]">
                          Confirm
                        </button>
                      </form>
                      <form action={reject}>
                        <button className="rounded-full border border-[var(--color-plum)] px-3 py-1.5 text-xs font-semibold text-[var(--color-plum)] hover:bg-[var(--color-plum-soft)]">
                          Not this time
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </OrganicCard>

      <OrganicCard className="p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          History
        </h2>
        <ul className="divide-y divide-[var(--color-divider)]">
          {done.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <div>
                <span className="font-medium">{v.participation.user.displayName}</span>
                <span className="ml-2 text-[var(--color-text-secondary)]">{v.participation.earthyDoing.title}</span>
              </div>
              <StatusPill status={v.status} />
            </li>
          ))}
        </ul>
      </OrganicCard>
    </div>
  );
}

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { resolvePartnerFor } from "@/lib/partner";
import { Badge, Card } from "@/components/ui";
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
      include: { user: { include: { journeyIdentity: true } }, earthyDoing: true },
      orderBy: { checkInAt: "desc" },
    }),
    db.verification.findMany({
      where: { partnerId: partner.id },
      include: {
        participation: {
          include: { user: { include: { journeyIdentity: true } }, earthyDoing: true },
        },
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
      <h1 className="text-2xl font-bold text-[var(--color-text)]">Verifications</h1>

      <Card title="1 · Checked-in participants (mark completion)">
        {inProgress.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">No participants awaiting completion.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-divider)]">
            {inProgress.map((p) => {
              const complete = completeParticipationAction.bind(null, p.id);
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      {p.user.displayName}{" "}
                      <span className="font-mono text-xs text-[var(--color-warmgray)]">
                        {p.user.journeyIdentity?.publicId}
                      </span>
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {p.earthyDoing.title} · tapped in {p.checkInAt.toLocaleTimeString()} ·{" "}
                      {p.interactionType.toUpperCase()}
                    </p>
                  </div>
                  <form action={complete}>
                    <button className="rounded-lg bg-[var(--color-pink)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-pink-hover)]">
                      Mark completed
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="2 · Pending verification (confirm participation)">
        {pending.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">No verifications pending.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-divider)]">
            {pending.map((v) => {
              const approve = approveVerificationAction.bind(null, v.id, undefined);
              const reject = rejectVerificationAction.bind(null, v.id, "PARTNER_REJECTED");
              return (
                <li key={v.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        {v.participation.user.displayName}{" "}
                        <span className="font-mono text-xs text-[var(--color-warmgray)]">
                          {v.participation.user.journeyIdentity?.publicId}
                        </span>
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {v.participation.earthyDoing.title} ·{" "}
                        {v.participation.checkInAt.toLocaleString()}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                        <Badge status={v.status} />
                        {v.evidence.map((e) => (
                          <span key={e.id} className="rounded bg-[var(--color-warmgray-soft)] px-1.5 py-0.5 text-[var(--color-text-secondary)]">
                            {e.evidenceType}
                          </span>
                        ))}
                        {v.aimAssessment && (
                          <span className="rounded bg-[var(--color-teal-soft)] px-1.5 py-0.5 text-[var(--color-teal-ink)]">
                            AIM: {v.aimAssessment.assessmentResult} ({((v.aimAssessment.confidence ?? 0) * 100).toFixed(0)}%)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <form action={approve}>
                        <button className="rounded-lg bg-[var(--color-pink)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-pink-hover)]">
                          Confirm & verify
                        </button>
                      </form>
                      <form action={reject}>
                        <button className="rounded-lg border border-[var(--color-plum)] px-3 py-1.5 text-xs font-semibold text-[var(--color-plum)] hover:bg-[var(--color-plum-soft)]">
                          Reject
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="History">
        <ul className="divide-y divide-[var(--color-divider)]">
          {done.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <div>
                <span className="font-medium">{v.participation.user.displayName}</span>
                <span className="ml-2 text-[var(--color-text-secondary)]">{v.participation.earthyDoing.title}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {v.aimAssessment && (
                  <span className="text-[var(--color-warmgray)]">
                    AIM {v.aimAssessment.assessmentResult} · {((v.aimAssessment.confidence ?? 0) * 100).toFixed(0)}%
                  </span>
                )}
                <Badge status={v.status} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

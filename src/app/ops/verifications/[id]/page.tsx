import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Badge, Card, DimensionBadge } from "@/components/ui";
import { revokeVerificationAction, approveVerificationAction, rejectVerificationAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

// TRS 45 — anatomy of a verification: expose the chain of evidence, not
// merely the outcome.
export default async function VerificationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await db.verification.findUnique({
    where: { id },
    include: {
      participation: {
        include: {
          user: { include: { journeyIdentity: true } },
          earthyDoing: { include: { partner: true, classifications: true, location: true } },
          device: true,
        },
      },
      evidence: true,
      aimAssessment: true,
      milestone: true,
    },
  });
  if (!v) notFound();

  const audits = await db.auditEvent.findMany({
    where: {
      OR: [
        { objectType: "verification", objectId: v.id },
        { objectType: "participation", objectId: v.participationId },
        ...(v.milestone ? [{ objectType: "journey_milestone", objectId: v.milestone.id }] : []),
        ...(v.aimAssessment ? [{ objectType: "aim_assessment", objectId: v.aimAssessment.id }] : []),
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  const aimExplanation = v.aimAssessment
    ? (JSON.parse(v.aimAssessment.explanation) as {
        summary?: string;
        factors?: { signal: string; present: boolean; weight: number }[];
      })
    : null;

  const approve = approveVerificationAction.bind(null, v.id, "ops_review");
  const reject = rejectVerificationAction.bind(null, v.id, "OPS_REJECTED");
  const revoke = revokeVerificationAction.bind(null, v.id, "ops_manual_revocation");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--color-warmgray)]">VERIFICATION {v.id}</p>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">{v.participation.earthyDoing.title}</h1>
        </div>
        <Badge status={v.status} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Participant">
          <p className="text-sm font-medium">{v.participation.user.displayName}</p>
          <p className="font-mono text-xs text-[var(--color-text-secondary)]">{v.participation.user.journeyIdentity?.publicId}</p>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            Device: {v.participation.device?.publicDeviceId ?? "manual"} · Check-in{" "}
            {v.participation.checkInAt.toLocaleString()}
          </p>
        </Card>
        <Card title="Partner & activity">
          <p className="text-sm font-medium">{v.participation.earthyDoing.partner.name}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {v.participation.earthyDoing.classifications.map((c) => (
              <DimensionBadge key={c.id} dimension={c.dimension} />
            ))}
          </div>
          {v.participation.earthyDoing.location && (
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">Location: {v.participation.earthyDoing.location.name}</p>
          )}
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Policy: {v.verificationPolicyVersion} · Method: {v.verificationMethod}</p>
        </Card>
      </div>

      <Card title="Supporting evidence">
        <ul className="space-y-2 text-sm">
          {v.evidence.map((e) => (
            <li key={e.id} className="flex items-start gap-2">
              <span className="text-[var(--color-mint-ink)]">✓</span>
              <div>
                <span className="font-medium">{e.evidenceType}</span>
                <span className="ml-2 text-xs text-[var(--color-warmgray)]">{e.source} · {e.createdAt.toLocaleString()}</span>
              </div>
            </li>
          ))}
          {v.evidence.length === 0 && <li className="text-[var(--color-text-secondary)]">No evidence recorded yet.</li>}
        </ul>
      </Card>

      <Card title="AIM assessment">
        {v.aimAssessment ? (
          <div className="text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <Badge status={v.aimAssessment.assessmentResult ?? "pending"} />
              <span className="text-[var(--color-text-secondary)]">
                Confidence: {((v.aimAssessment.confidence ?? 0) * 100).toFixed(0)}%
              </span>
              <span className="font-mono text-xs text-[var(--color-warmgray)]">{v.aimAssessment.aimRequestId}</span>
              <span className="text-xs text-[var(--color-warmgray)]">{v.aimAssessment.modelVersion}</span>
            </div>
            {aimExplanation?.summary && <p className="mt-2 text-[var(--color-text-secondary)]">{aimExplanation.summary}</p>}
            {aimExplanation?.factors && (
              <table className="mt-3 w-full text-xs">
                <thead>
                  <tr className="text-left text-[var(--color-warmgray)]">
                    <th className="py-1">Signal</th><th>Present</th><th>Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {aimExplanation.factors.map((f) => (
                    <tr key={f.signal} className="border-t border-[var(--color-divider)]">
                      <td className="py-1">{f.signal}</td>
                      <td>{f.present ? "✓" : "✗"}</td>
                      <td>{f.weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-secondary)]">AIM has not evaluated this verification yet.</p>
        )}
      </Card>

      <Card title="Decision">
        <div className="flex flex-wrap gap-2">
          {["pending", "review"].includes(v.status) && (
            <>
              <form action={approve}>
                <button className="rounded-lg bg-[var(--color-pink)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-pink-hover)]">
                  Approve
                </button>
              </form>
              <form action={reject}>
                <button className="rounded-lg border border-[var(--color-plum)] px-4 py-2 text-sm font-semibold text-[var(--color-plum)] hover:bg-[var(--color-plum-soft)]">
                  Reject
                </button>
              </form>
            </>
          )}
          {v.status === "verified" && (
            <form action={revoke}>
              <button className="rounded-lg border border-[var(--color-plum)] px-4 py-2 text-sm font-semibold text-[var(--color-plum)] hover:bg-[var(--color-plum-soft)]">
                Revoke milestone
              </button>
            </form>
          )}
          {!["pending", "review", "verified"].includes(v.status) && (
            <p className="text-sm text-[var(--color-text-secondary)]">No actions available in status “{v.status}”.</p>
          )}
        </div>
      </Card>

      <Card title="Audit history">
        <ul className="space-y-1.5 text-xs text-[var(--color-text-secondary)]">
          {audits.map((a) => (
            <li key={a.id} className="flex flex-wrap gap-2">
              <span className="text-[var(--color-warmgray)]">{a.createdAt.toLocaleString()}</span>
              <span className="font-mono font-medium">{a.action}</span>
              <span className="text-[var(--color-warmgray)]">by {a.actorType}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Badge, DimensionBadge, Card } from "@/components/ui";
import { openDisputeAction } from "@/lib/actions";

// TRS 50 — "VIEW VERIFICATION": explain the evidence behind a milestone
// without exposing sensitive internal information.
export const dynamic = "force-dynamic";

const EVIDENCE_LABELS: Record<string, string> = {
  nfc_tap: "NFC JourneyPort interaction",
  partner_confirmation: "Partner confirmation",
  timestamp: "Timestamp record",
  location: "Location evidence",
  attendance: "Attendance record",
  completion: "Completion record",
};

export default async function MilestoneDetail({ params }: { params: Promise<{ publicId: string }> }) {
  const user = await requireUser();
  const { publicId } = await params;
  const m = await db.journeyMilestone.findUnique({
    where: { publicId },
    include: {
      earthyDoing: { include: { partner: true, classifications: true, location: true } },
      verification: { include: { evidence: true, aimAssessment: true } },
      participation: true,
      disputes: true,
    },
  });
  if (!m || m.userId !== user.id) notFound();

  const aim = m.verification.aimAssessment;
  const explanation = aim ? (JSON.parse(aim.explanation) as { summary?: string }) : null;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-slate-400">MILESTONE {m.publicId}</p>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">{m.earthyDoing.title}</h1>
          <Badge status={m.status} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {m.earthyDoing.classifications.map((c) => (
            <DimensionBadge key={c.id} dimension={c.dimension} />
          ))}
        </div>
      </div>

      <Card title="Why this milestone is trusted">
        <ul className="space-y-2 text-sm text-slate-700">
          {m.verification.evidence.map((e) => (
            <li key={e.id} className="flex items-center gap-2">
              <span className="text-emerald-600">✓</span>
              {EVIDENCE_LABELS[e.evidenceType] ?? e.evidenceType}
            </li>
          ))}
          {aim && (
            <li className="flex items-center gap-2">
              <span className="text-emerald-600">✓</span>
              AIM Trust Layer assessment:{" "}
              <Badge status={aim.assessmentResult ?? "pending"} />
              {aim.confidence != null && (
                <span className="text-xs text-slate-500">
                  confidence {(aim.confidence * 100).toFixed(0)}%
                </span>
              )}
            </li>
          )}
        </ul>
        {explanation?.summary && (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {explanation.summary}
          </p>
        )}
      </Card>

      <Card title="Details">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-500">Partner</dt>
          <dd className="font-medium">{m.earthyDoing.partner.name}</dd>
          <dt className="text-slate-500">Participated</dt>
          <dd className="font-medium">{m.participation.checkInAt.toLocaleString()}</dd>
          <dt className="text-slate-500">Verified</dt>
          <dd className="font-medium">{m.verifiedAt ? m.verifiedAt.toLocaleString() : "—"}</dd>
          {m.earthyDoing.location && (
            <>
              <dt className="text-slate-500">Location</dt>
              <dd className="font-medium">{m.earthyDoing.location.name}</dd>
            </>
          )}
        </dl>
      </Card>

      {m.disputes.some((d) => d.status !== "resolved") ? (
        <Card title="Dispute">
          <p className="text-sm text-slate-600">
            You have an open dispute on this milestone. Beaurity Operations will review it.
          </p>
        </Card>
      ) : (
        <Card title="Something wrong? (US-007)">
          <form action={openDisputeAction} className="space-y-3">
            <input type="hidden" name="milestoneId" value={m.id} />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Reason</label>
              <select name="reason" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">Select a reason…</option>
                <option value="not_me">This was not my participation</option>
                <option value="wrong_activity">Wrong activity recorded</option>
                <option value="wrong_status">Verification status is incorrect</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <textarea name="description" rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <button className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
              Open dispute
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}

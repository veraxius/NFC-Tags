import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { DimensionBadge } from "@/components/ui";
import { OrganicCard, StatusPill, Headline, trustSummary } from "@/components/organic";
import { openDisputeAction } from "@/lib/actions";

// TRS 50 — "VIEW VERIFICATION": explain the evidence behind a milestone in
// language a person can actually read, without exposing internal fields.
export const dynamic = "force-dynamic";

const EVIDENCE_COPY: Record<string, string> = {
  nfc_tap: "You tapped your JourneyPort",
  partner_confirmation: "confirmed",
  timestamp: "The timing lined up",
  location: "The location matched",
  attendance: "Your attendance was logged",
  completion: "It was marked complete",
  certificate: "A certificate backs this up",
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
  const partnerName = m.earthyDoing.partner.name;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-3">
          <Headline className="text-2xl">{m.earthyDoing.title}</Headline>
          <StatusPill status={m.status} />
        </div>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {m.earnedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          {m.earthyDoing.location && ` · ${m.earthyDoing.location.name}`}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {m.earthyDoing.classifications.map((c) => (
            <DimensionBadge key={c.id} dimension={c.dimension} />
          ))}
        </div>
      </div>

      <OrganicCard className="p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Why this counts
        </h2>
        <p className="text-sm text-[var(--color-text)]">
          {trustSummary(aim?.assessmentResult, partnerName)}
        </p>
        <ul className="mt-4 space-y-2 text-sm text-[var(--color-text-secondary)]">
          {m.verification.evidence.map((e) => (
            <li key={e.id} className="flex items-center gap-2">
              <span className="text-[var(--color-mint-ink)]">✓</span>
              {e.evidenceType === "partner_confirmation"
                ? `${partnerName} confirmed it`
                : EVIDENCE_COPY[e.evidenceType] ?? e.evidenceType.replace(/_/g, " ")}
            </li>
          ))}
        </ul>
      </OrganicCard>

      <OrganicCard className="p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Details
        </h2>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
          <dt className="text-[var(--color-text-secondary)]">Organization</dt>
          <dd className="font-medium">{partnerName}</dd>
          <dt className="text-[var(--color-text-secondary)]">You showed up</dt>
          <dd className="font-medium">{m.participation.checkInAt.toLocaleString()}</dd>
          <dt className="text-[var(--color-text-secondary)]">Confirmed</dt>
          <dd className="font-medium">{m.verifiedAt ? m.verifiedAt.toLocaleString() : "Not yet"}</dd>
        </dl>
      </OrganicCard>

      {m.disputes.some((d) => d.status !== "resolved") ? (
        <OrganicCard className="p-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            You flagged this one
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Someone from Beaurity is taking a closer look — we&apos;ll let you
            know what we find.
          </p>
        </OrganicCard>
      ) : (
        <OrganicCard className="p-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            Something look off?
          </h2>
          <form action={openDisputeAction} className="space-y-3">
            <input type="hidden" name="milestoneId" value={m.id} />
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
                What happened?
              </label>
              <select
                name="reason"
                required
                className="w-full rounded-2xl border border-[var(--color-warmgray)] px-3 py-2 text-sm"
              >
                <option value="">Choose one…</option>
                <option value="not_me">This wasn&apos;t me</option>
                <option value="wrong_activity">This isn&apos;t what I did</option>
                <option value="wrong_status">Something about the status is wrong</option>
                <option value="other">Something else</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
                Tell us more
              </label>
              <textarea
                name="description"
                rows={2}
                className="w-full rounded-2xl border border-[var(--color-warmgray)] px-3 py-2 text-sm"
              />
            </div>
            <button className="rounded-full border border-[var(--color-plum)] px-4 py-2 text-sm font-semibold text-[var(--color-plum)] hover:bg-[var(--color-plum-soft)]">
              Flag this milestone
            </button>
          </form>
        </OrganicCard>
      )}
    </div>
  );
}

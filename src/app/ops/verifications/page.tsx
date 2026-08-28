import Link from "next/link";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

// TRS 45 — Screen 06 VERIFICATION CONTROL CENTER
const QUEUES = ["pending", "review", "verified", "rejected", "disputed", "revoked"] as const;

export default async function OpsVerifications({
  searchParams,
}: {
  searchParams: Promise<{ queue?: string }>;
}) {
  const { queue = "pending" } = await searchParams;
  const counts = Object.fromEntries(
    await Promise.all(
      QUEUES.map(async (q) => [q, await db.verification.count({ where: { status: q } })])
    )
  );
  const verifications = await db.verification.findMany({
    where: { status: queue },
    include: {
      participation: {
        include: { user: { include: { journeyIdentity: true } }, earthyDoing: { include: { partner: true } } },
      },
      aimAssessment: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">Verification Control Center</h1>
      <div className="flex flex-wrap gap-2">
        {QUEUES.map((q) => (
          <Link
            key={q}
            href={`/ops/verifications?queue=${q}`}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
              q === queue
                ? "border-[var(--color-pink)] bg-[var(--color-pink)] text-white"
                : "border-[var(--color-warmgray)] bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-alt)]"
            }`}
          >
            {q.replace(/_/g, " ").toUpperCase()} ({counts[q]})
          </Link>
        ))}
      </div>
      <div className="space-y-3">
        {verifications.length === 0 && (
          <p className="text-sm text-[var(--color-text-secondary)]">No verifications in this queue.</p>
        )}
        {verifications.map((v) => (
          <Link
            key={v.id}
            href={`/ops/verifications/${v.id}`}
            className="block rounded-xl border border-[var(--color-divider)] bg-white p-4 shadow-sm hover:border-[var(--color-mint)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-[var(--color-text)]">{v.participation.earthyDoing.title}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {v.participation.user.displayName} ·{" "}
                  <span className="font-mono">{v.participation.user.journeyIdentity?.publicId}</span> ·{" "}
                  {v.participation.earthyDoing.partner.name} · {v.createdAt.toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {v.aimAssessment && (
                  <span className="text-xs text-[var(--color-warmgray)]">
                    AIM {v.aimAssessment.assessmentResult} ({((v.aimAssessment.confidence ?? 0) * 100).toFixed(0)}%)
                  </span>
                )}
                <Badge status={v.status} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

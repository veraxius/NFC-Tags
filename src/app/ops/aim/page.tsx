import Link from "next/link";
import { db } from "@/lib/db";
import { Table, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

// TRS 47 — Screen 08 AIM TRUST. Shows claim-level trust assessments.
// This screen must never become a human ranking system.
export default async function OpsAim() {
  const assessments = await db.aimAssessment.findMany({
    include: {
      verification: {
        include: { participation: { include: { earthyDoing: true } } },
      },
    },
    orderBy: { requestedAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">AIM Trust Layer</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Credibility assessments of verification claims — never of people.
        </p>
      </div>
      <Table headers={["Assessment", "Earthy Doing", "Result", "Confidence", "Model", "Completed", "Verification"]}>
        {assessments.map((a) => (
          <tr key={a.id}>
            <td className="px-4 py-2.5 font-mono text-xs">{a.aimRequestId}</td>
            <td className="px-4 py-2.5">{a.verification.participation.earthyDoing.title}</td>
            <td className="px-4 py-2.5"><Badge status={a.assessmentResult ?? a.status} /></td>
            <td className="px-4 py-2.5">{a.confidence != null ? `${(a.confidence * 100).toFixed(0)}%` : "—"}</td>
            <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-secondary)]">{a.modelVersion}</td>
            <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{a.completedAt?.toLocaleString() ?? "—"}</td>
            <td className="px-4 py-2.5">
              <Link href={`/ops/verifications/${a.verificationId}`} className="text-xs font-semibold text-[var(--color-pink)] hover:underline">
                View →
              </Link>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

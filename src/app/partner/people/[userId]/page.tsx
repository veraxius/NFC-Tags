import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { resolvePartnerFor } from "@/lib/partner";
import { db } from "@/lib/db";
import { Card, Table, Badge, Kpi, DimensionBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

// Partner-scoped person detail. Deliberately narrower than the Ops member
// detail (src/app/ops/members/[id]/page.tsx): only this person's activity
// with THIS partner — no email, devices, consent history, or cross-org
// audit trail. "Organizations only see what they need to confirm you were
// there — nothing more" (the platform's own stated privacy principle).
export default async function PartnerPersonDetail({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const user = await requireUser();
  const partner = await resolvePartnerFor(user);
  const { userId } = await params;

  const participations = await db.participation.findMany({
    where: { userId, partnerId: partner.id },
    orderBy: { checkInAt: "desc" },
    include: {
      earthyDoing: { include: { classifications: true } },
      verification: true,
    },
  });
  if (participations.length === 0) notFound();

  const person = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: { journeyIdentity: true },
  });

  const verifiedCount = participations.filter((p) => p.verification?.status === "verified").length;
  const dates = participations.map((p) => p.checkInAt.getTime());
  const firstActivity = new Date(Math.min(...dates));
  const lastActivity = new Date(Math.max(...dates));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/partner/people" className="text-[13px] font-medium text-[var(--color-pink)] hover:underline">
          ‹ People
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
            {person.displayName ?? `${person.firstName} ${person.lastName}`}
          </h1>
        </div>
        <p className="mt-1 font-mono text-xs text-[var(--color-text-secondary)]">
          {person.journeyIdentity?.publicId}
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          Activity shown here is limited to what this person has done with {partner.name}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Participations" value={participations.length} />
        <Kpi label="Verified" value={verifiedCount} accent />
        <Kpi label="First activity" value={firstActivity.toLocaleDateString()} />
        <Kpi label="Last activity" value={lastActivity.toLocaleDateString()} />
      </div>

      <Card title={`Earthy Doings with ${partner.name}`}>
        <Table headers={["Earthy Doing", "Dimensions", "Date", "Status"]}>
          {participations.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-2.5 font-medium">{p.earthyDoing.title}</td>
              <td className="px-4 py-2.5">
                <div className="flex flex-wrap gap-1">
                  {p.earthyDoing.classifications.map((c) => (
                    <DimensionBadge key={c.id} dimension={c.dimension} />
                  ))}
                </div>
              </td>
              <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                {p.checkInAt.toLocaleDateString()}
              </td>
              <td className="px-4 py-2.5">
                <Badge status={p.verification?.status ?? p.status} />
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}

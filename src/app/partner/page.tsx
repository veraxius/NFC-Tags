import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { resolvePartnerFor } from "@/lib/partner";
import { Kpi } from "@/components/ui";
import { OrganicCard, Headline } from "@/components/organic";

export const dynamic = "force-dynamic";

export default async function PartnerOverview() {
  const user = await requireUser();
  const partner = await resolvePartnerFor(user);

  const [doings, participations, pendingVerifications, verifiedCount] = await Promise.all([
    db.earthyDoing.count({ where: { partnerId: partner.id } }),
    db.participation.count({ where: { partnerId: partner.id } }),
    db.verification.count({ where: { partnerId: partner.id, status: { in: ["pending", "review"] } } }),
    db.verification.count({ where: { partnerId: partner.id, status: "verified" } }),
  ]);

  const awaitingCompletion = await db.participation.findMany({
    where: { partnerId: partner.id, status: { in: ["detected", "in_progress"] } },
    include: { user: true, earthyDoing: true },
    orderBy: { checkInAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Headline className="text-3xl">{partner.name}</Headline>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Your impact, tracked and verified.
          </p>
        </div>
        <Link
          href="/partner/doings/new"
          className="rounded-full bg-[var(--color-pink)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-pink-hover)]"
        >
          + New Earthy Doing
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Activities" value={doings} />
        <Kpi label="People who showed up" value={participations} />
        <Kpi label="Waiting on you" value={pendingVerifications} />
        <Kpi label="Verified" value={verifiedCount} accent />
      </div>

      <OrganicCard className="p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          People here right now
        </h2>
        {awaitingCompletion.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">Nobody's checked in at the moment.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-divider)] text-sm">
            {awaitingCompletion.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <span className="font-medium">{p.user.displayName}</span>
                  <span className="ml-2 text-[var(--color-text-secondary)]">· {p.earthyDoing.title}</span>
                </div>
                <Link href="/partner/verifications" className="text-xs font-semibold text-[var(--color-pink)] hover:underline">
                  Confirm →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </OrganicCard>
    </div>
  );
}

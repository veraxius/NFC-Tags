import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { resolvePartnerFor } from "@/lib/partner";
import { Kpi, Badge, Card } from "@/components/ui";

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
    include: { user: { include: { journeyIdentity: true } }, earthyDoing: true },
    orderBy: { checkInAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{partner.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Partner ID <span className="font-mono">{partner.publicId}</span> · <Badge status={partner.status} />
          </p>
        </div>
        <Link
          href="/partner/doings/new"
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          + Create Earthy Doing
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Earthy Doings" value={doings} />
        <Kpi label="Participations" value={participations} />
        <Kpi label="Pending verification" value={pendingVerifications} />
        <Kpi label="Verified milestones" value={verifiedCount} accent />
      </div>

      <Card title="Participants awaiting completion">
        {awaitingCompletion.length === 0 ? (
          <p className="text-sm text-slate-500">No participants currently checked in.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {awaitingCompletion.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <div>
                  <span className="font-medium">{p.user.displayName}</span>
                  <span className="ml-2 font-mono text-xs text-slate-400">
                    {p.user.journeyIdentity?.publicId}
                  </span>
                  <span className="ml-2 text-slate-500">· {p.earthyDoing.title}</span>
                </div>
                <Link href="/partner/verifications" className="text-xs font-semibold text-emerald-700 hover:underline">
                  Manage →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

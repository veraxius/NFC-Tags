import { db } from "@/lib/db";
import { Table, Badge } from "@/components/ui";
import { setPartnerStatusAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

// TRS 43 — Screen 04 PARTNERS
export default async function OpsPartners() {
  const partners = await db.partner.findMany({
    include: {
      _count: {
        select: {
          earthyDoings: true,
          participations: true,
          verifications: { where: { status: "verified" } },
        },
      },
      verifications: { select: { id: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">Partners</h1>
      <Table headers={["Partner", "Type", "Status", "Earthy Doings", "Participants", "Verification %", "Actions"]}>
        {partners.map((p) => {
          const pct =
            p.verifications.length > 0
              ? Math.round((p._count.verifications / p.verifications.length) * 100)
              : 0;
          const approve = setPartnerStatusAction.bind(null, p.id, "active");
          const suspend = setPartnerStatusAction.bind(null, p.id, "suspended");
          return (
            <tr key={p.id}>
              <td className="px-4 py-2.5">
                <p className="font-medium text-[var(--color-text)]">{p.name}</p>
                <p className="font-mono text-xs text-[var(--color-warmgray)]">{p.publicId}</p>
              </td>
              <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{p.type}</td>
              <td className="px-4 py-2.5"><Badge status={p.status} /></td>
              <td className="px-4 py-2.5">{p._count.earthyDoings}</td>
              <td className="px-4 py-2.5">{p._count.participations}</td>
              <td className="px-4 py-2.5">{pct}%</td>
              <td className="px-4 py-2.5">
                <div className="flex gap-2">
                  {["applicant", "under_review", "suspended", "approved"].includes(p.status) && (
                    <form action={approve}>
                      <button className="rounded border border-[var(--color-mint)] px-2 py-1 text-xs font-semibold text-[var(--color-mint-ink)] hover:bg-[var(--color-mint-soft)]">
                        Approve
                      </button>
                    </form>
                  )}
                  {["approved", "active"].includes(p.status) && (
                    <form action={suspend}>
                      <button className="rounded border border-[var(--color-plum)] px-2 py-1 text-xs font-semibold text-[var(--color-plum)] hover:bg-[var(--color-plum-soft)]">
                        Suspend
                      </button>
                    </form>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}

import { redirect } from "next/navigation";
import { requireUser, isPartnerAdmin } from "@/lib/auth";
import { resolvePartnerFor } from "@/lib/partner";
import { db } from "@/lib/db";
import { Table, Badge, Card } from "@/components/ui";
import { addPartnerStaffAction, setPartnerStaffStatusAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  administrator: "Administrator",
  operator: "Operator",
};

// Who can sign in and act on behalf of this organization — separate from
// "People" (everyone who has shown up to an Earthy Doing). Admin-only:
// staff, not participants.
export default async function PartnerTeam({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string }>;
}) {
  const user = await requireUser();
  const partner = await resolvePartnerFor(user);
  if (!isPartnerAdmin(user, partner.id)) redirect("/partner");

  const { error, email } = await searchParams;

  const staff = await db.partnerUser.findMany({
    where: { partnerId: partner.id },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Team</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Who can sign in and act on behalf of {partner.name}.
        </p>
      </div>

      <Table headers={["Name", "Email", "Role", "Status", "Actions"]}>
        {staff.length === 0 ? (
          <tr>
            <td colSpan={5} className="px-4 py-4 text-sm text-[var(--color-text-secondary)]">
              No staff added yet.
            </td>
          </tr>
        ) : (
          staff.map((pu) => {
            const suspend = setPartnerStaffStatusAction.bind(null, pu.id, "suspended");
            const reactivate = setPartnerStaffStatusAction.bind(null, pu.id, "active");
            return (
              <tr key={pu.id}>
                <td className="px-4 py-2.5 font-medium">
                  {pu.user.displayName ?? `${pu.user.firstName} ${pu.user.lastName}`}
                </td>
                <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{pu.user.email}</td>
                <td className="px-4 py-2.5">{ROLE_LABELS[pu.role] ?? pu.role}</td>
                <td className="px-4 py-2.5">
                  <Badge status={pu.status} />
                </td>
                <td className="px-4 py-2.5">
                  {pu.status === "active" ? (
                    <form action={suspend}>
                      <button className="rounded border border-[var(--color-gold)] px-2 py-1 text-xs text-[var(--color-gold-ink)] hover:bg-[var(--color-gold-soft)]">
                        Suspend
                      </button>
                    </form>
                  ) : (
                    <form action={reactivate}>
                      <button className="rounded border border-[var(--color-mint)] px-2 py-1 text-xs text-[var(--color-mint-ink)] hover:bg-[var(--color-mint-soft)]">
                        Reactivate
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            );
          })
        )}
      </Table>

      <Card title="+ Add staff">
        {error === "NO_ACCOUNT" && (
          <p className="mb-3 rounded-2xl bg-[var(--color-plum-soft)] px-3 py-2 text-sm text-[var(--color-plum)]">
            No JourneyPort account found for {email}. Ask them to create one first (they can sign up like any
            member) — then add them here.
          </p>
        )}
        <form action={addPartnerStaffAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="partnerId" value={partner.id} />
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
              Their email (must already have a JourneyPort account)
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="name@example.com"
              className="w-64 rounded-lg border border-[var(--color-warmgray)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Role</label>
            <select name="role" defaultValue="operator" className="rounded-lg border border-[var(--color-warmgray)] px-3 py-2 text-sm">
              <option value="operator">Operator</option>
              <option value="administrator">Administrator</option>
            </select>
          </div>
          <button className="rounded-lg bg-[var(--color-pink)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-pink-hover)]">
            Add to team
          </button>
        </form>
      </Card>
    </div>
  );
}

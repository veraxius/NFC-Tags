import { db } from "@/lib/db";
import { Table, Badge, Card } from "@/components/ui";
import {
  addDeviceInventoryAction,
  setDeviceStatusAction,
  assignDeviceAction,
  replaceDeviceAction,
} from "@/lib/actions";

export const dynamic = "force-dynamic";

// TRS 46 — Screen 07 JOURNEYPORT DEVICE CENTER
export default async function OpsDevices({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const { created } = await searchParams;
  const createdTokens: { deviceId: string; token: string }[] = created
    ? JSON.parse(created)
    : [];

  const devices = await db.journeyPortDevice.findMany({
    include: { user: { include: { journeyIdentity: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">JourneyPort Device Center</h1>

      {createdTokens.length > 0 && (
        <Card title="⚠ New NFC tokens — shown only once (write these to the physical chips)">
          <ul className="space-y-1 font-mono text-xs">
            {createdTokens.map((t) => (
              <li key={t.deviceId} className="rounded bg-[var(--color-bg-alt)] px-2 py-1.5">
                <span className="font-semibold">{t.deviceId}</span> → /t/{t.token}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            The platform stores only a hash of each token. Program each NFC chip
            with the full URL (https://&lt;host&gt;/t/&lt;token&gt;).
          </p>
        </Card>
      )}

      <Card title="Add inventory">
        <form action={addDeviceInventoryAction} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Quantity</label>
            <input name="count" type="number" min={1} max={50} defaultValue={5} className="w-24 rounded-lg border border-[var(--color-warmgray)] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Type</label>
            <select name="deviceType" className="rounded-lg border border-[var(--color-warmgray)] px-3 py-2 text-sm">
              <option value="card">Card (MVP)</option>
              <option value="bracelet">Bracelet</option>
              <option value="keytag">Key tag</option>
            </select>
          </div>
          <button className="rounded-lg bg-[var(--color-pink)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-pink-hover)]">
            Generate devices & tokens
          </button>
        </form>
      </Card>

      <Table headers={["Device ID", "Type", "Member", "Activated", "Last tap", "Status", "Actions"]}>
        {devices.map((d) => {
          const suspend = setDeviceStatusAction.bind(null, d.id, "suspended", "ops_suspend");
          const revoke = setDeviceStatusAction.bind(null, d.id, "revoked", "ops_revoke");
          const reactivate = setDeviceStatusAction.bind(null, d.id, "active", "ops_reactivate");
          const replace = replaceDeviceAction.bind(null, d.id);
          async function assign(formData: FormData) {
            "use server";
            await assignDeviceAction(d.id, String(formData.get("member") ?? ""));
          }
          return (
            <tr key={d.id}>
              <td className="px-4 py-2.5 font-mono text-xs font-semibold">{d.publicDeviceId}</td>
              <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{d.deviceType}</td>
              <td className="px-4 py-2.5">
                {d.user ? (
                  <>
                    <span className="text-[var(--color-text)]">{d.user.displayName}</span>
                    <span className="ml-1 font-mono text-xs text-[var(--color-warmgray)]">
                      {d.user.journeyIdentity?.publicId}
                    </span>
                  </>
                ) : (
                  <span className="text-[var(--color-warmgray)]">—</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                {d.activatedAt ? d.activatedAt.toLocaleDateString() : "—"}
              </td>
              <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                {d.lastUsedAt ? d.lastUsedAt.toLocaleString() : "—"}
              </td>
              <td className="px-4 py-2.5"><Badge status={d.status} /></td>
              <td className="px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {d.status === "inventory" && (
                    <form action={assign} className="flex items-center gap-1">
                      <input
                        name="member"
                        required
                        placeholder="Journey ID or email"
                        className="w-36 rounded border border-black/10 px-2 py-1 text-xs"
                      />
                      <button className="rounded border border-[var(--color-teal)] px-2 py-1 text-xs text-[var(--color-teal-ink)] hover:bg-[var(--color-teal-soft)]">
                        Assign
                      </button>
                    </form>
                  )}
                  {d.status === "active" && (
                    <form action={suspend}>
                      <button className="rounded border border-[var(--color-gold)] px-2 py-1 text-xs text-[var(--color-gold-ink)] hover:bg-[var(--color-gold-soft)]">Suspend</button>
                    </form>
                  )}
                  {["suspended", "lost", "stolen"].includes(d.status) && (
                    <form action={reactivate}>
                      <button className="rounded border border-[var(--color-mint)] px-2 py-1 text-xs text-[var(--color-mint-ink)] hover:bg-[var(--color-mint-soft)]">Reactivate</button>
                    </form>
                  )}
                  {["active", "suspended", "lost", "stolen"].includes(d.status) && (
                    <form action={replace}>
                      <button className="rounded border border-black/10 px-2 py-1 text-xs text-[var(--color-text)] hover:bg-black/[0.04]">
                        Replace
                      </button>
                    </form>
                  )}
                  {d.status !== "revoked" && d.status !== "retired" && d.status !== "replaced" && (
                    <form action={revoke}>
                      <button className="rounded border border-[var(--color-plum)] px-2 py-1 text-xs text-[var(--color-plum)] hover:bg-[var(--color-plum-soft)]">Revoke</button>
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

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { setDeviceStatusAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function MyDevices() {
  const user = await requireUser();
  const devices = await db.journeyPortDevice.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-text)]">My JourneyPorts</h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Physical NFC devices connected to your Journey identity. All devices
        resolve to the same Journey.
      </p>
      <div className="mt-6 space-y-4">
        {devices.length === 0 && (
          <p className="text-sm text-[var(--color-text-secondary)]">
            No devices yet. Tap a new JourneyPort card to activate it.
          </p>
        )}
        {devices.map((d) => {
          const reportLost = setDeviceStatusAction.bind(null, d.id, "lost", "member_reported_lost");
          const suspend = setDeviceStatusAction.bind(null, d.id, "suspended", "member_suspended");
          const reactivate = setDeviceStatusAction.bind(null, d.id, "active", "member_reactivated");
          return (
            <Card key={d.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono font-semibold text-[var(--color-text)]">{d.publicDeviceId}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {d.deviceType} · activated{" "}
                    {d.activatedAt ? d.activatedAt.toLocaleDateString() : "—"} · last tap{" "}
                    {d.lastUsedAt ? d.lastUsedAt.toLocaleString() : "never"}
                  </p>
                </div>
                <Badge status={d.status} />
              </div>
              <div className="mt-3 flex gap-2">
                {d.status === "active" && (
                  <>
                    <form action={suspend}>
                      <button className="rounded-lg border border-[var(--color-gold)] px-3 py-1.5 text-xs font-semibold text-[var(--color-gold-ink)] hover:bg-[var(--color-gold-soft)]">
                        Suspend
                      </button>
                    </form>
                    <form action={reportLost}>
                      <button className="rounded-lg border border-[var(--color-plum)] px-3 py-1.5 text-xs font-semibold text-[var(--color-plum)] hover:bg-[var(--color-plum-soft)]">
                        Report lost (US-006)
                      </button>
                    </form>
                  </>
                )}
                {d.status === "suspended" && (
                  <form action={reactivate}>
                    <button className="rounded-lg border border-[var(--color-mint)] px-3 py-1.5 text-xs font-semibold text-[var(--color-mint-ink)] hover:bg-[var(--color-mint-soft)]">
                      Reactivate
                    </button>
                  </form>
                )}
                {["lost", "stolen", "revoked"].includes(d.status) && (
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Token disabled. Your Journey history remains intact — contact
                    operations for a replacement.
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

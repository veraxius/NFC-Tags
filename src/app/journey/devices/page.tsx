import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { setDeviceStatusAction } from "@/lib/actions";
import { OrganicCard, StatusPill, Headline } from "@/components/organic";

export const dynamic = "force-dynamic";

export default async function MyDevices() {
  const user = await requireUser();
  const devices = await db.journeyPortDevice.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const typeLabel: Record<string, string> = {
    card: "Card",
    bracelet: "Bracelet",
    ring: "Ring",
    keytag: "Key tag",
    mobile: "Phone",
    other: "JourneyPort",
  };

  return (
    <div>
      <Headline className="text-3xl">My JourneyPorts</Headline>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Every card or bracelet you&apos;ve connected — they all lead back to
        the same Journey.
      </p>
      <div className="mt-6 space-y-4">
        {devices.length === 0 && (
          <OrganicCard className="p-6 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Nothing connected yet. Tap a new JourneyPort to get started.
            </p>
          </OrganicCard>
        )}
        {devices.map((d) => {
          const reportLost = setDeviceStatusAction.bind(null, d.id, "lost", "member_reported_lost");
          const suspend = setDeviceStatusAction.bind(null, d.id, "suspended", "member_suspended");
          const reactivate = setDeviceStatusAction.bind(null, d.id, "active", "member_reactivated");
          return (
            <OrganicCard key={d.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--color-text)]">
                    {typeLabel[d.deviceType] ?? "JourneyPort"}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {d.activatedAt ? `Connected ${d.activatedAt.toLocaleDateString()}` : "Not yet activated"}
                    {d.lastUsedAt && ` · last tap ${d.lastUsedAt.toLocaleString()}`}
                  </p>
                </div>
                <StatusPill status={d.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {d.status === "active" && (
                  <>
                    <form action={suspend}>
                      <button className="rounded-full border border-[var(--color-gold)] px-3 py-1.5 text-xs font-semibold text-[var(--color-gold-ink)] hover:bg-[var(--color-gold-soft)]">
                        Pause it
                      </button>
                    </form>
                    <form action={reportLost}>
                      <button className="rounded-full border border-[var(--color-plum)] px-3 py-1.5 text-xs font-semibold text-[var(--color-plum)] hover:bg-[var(--color-plum-soft)]">
                        I lost it
                      </button>
                    </form>
                  </>
                )}
                {d.status === "suspended" && (
                  <form action={reactivate}>
                    <button className="rounded-full border border-[var(--color-mint)] px-3 py-1.5 text-xs font-semibold text-[var(--color-mint-ink)] hover:bg-[var(--color-mint-soft)]">
                      Turn it back on
                    </button>
                  </form>
                )}
                {["lost", "stolen", "revoked"].includes(d.status) && (
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    This one&apos;s deactivated — nothing you&apos;ve done is
                    lost. Reach out and we&apos;ll get you a replacement.
                  </p>
                )}
              </div>
            </OrganicCard>
          );
        })}
      </div>
    </div>
  );
}

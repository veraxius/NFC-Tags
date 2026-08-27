import Link from "next/link";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { hashNfcToken } from "@/lib/ids";
import { audit } from "@/lib/audit";
import { activateDeviceAction, tapParticipateAction } from "@/lib/actions";
import { Badge, DimensionBadge } from "@/components/ui";

// TRS 24 — NFC tap request: resolve token → device → context → experience.
// This page is what opens when a member taps their physical JourneyPort card:
// the NFC chip holds only https://<host>/t/{token} (no personal data, TRS 23).

export const dynamic = "force-dynamic";

export default async function TapPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const user = await getSessionUser();

  const device = await db.journeyPortDevice.findUnique({
    where: { tokenHash: hashNfcToken(token) },
    include: { user: { include: { journeyIdentity: true } } },
  });

  await audit({
    actorType: user ? "member" : "system",
    actorId: user?.id,
    action: "nfc.tap_resolved",
    objectType: "journeyport_device",
    objectId: device?.id ?? "unknown_token",
    newState: { found: !!device, status: device?.status },
  });

  const shell = (children: React.ReactNode) => (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
          Beaurity JourneyPort™
        </p>
        {children}
      </div>
    </main>
  );

  if (!device) {
    return shell(
      <>
        <h1 className="mt-2 text-xl font-bold text-slate-900">Unknown JourneyPort</h1>
        <p className="mt-2 text-sm text-slate-600">
          This JourneyPort could not be resolved. It may have been replaced or
          revoked. Please contact support.
        </p>
      </>
    );
  }

  if (["revoked", "lost", "stolen", "suspended", "retired", "replaced"].includes(device.status)) {
    return shell(
      <>
        <h1 className="mt-2 text-xl font-bold text-red-700">JourneyPort not active</h1>
        <p className="mt-2 text-sm text-slate-600">
          This JourneyPort device is currently <Badge status={device.status} /> and cannot
          create interactions. If this is your device, request a replacement.
        </p>
      </>
    );
  }

  // Not signed in → authenticate first (TRS 24 step 6)
  if (!user) {
    return shell(
      <>
        <h1 className="mt-2 text-xl font-bold text-slate-900">Welcome to JourneyPort</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in or create your Journey identity to continue with this JourneyPort.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link
            href={`/login?next=/t/${token}`}
            className="rounded-lg bg-emerald-700 px-4 py-2.5 text-center font-semibold text-white hover:bg-emerald-800"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-center font-semibold text-slate-700 hover:bg-slate-50"
          >
            Create account
          </Link>
        </div>
      </>
    );
  }

  // Device not yet activated → activation experience (US-002)
  if (["inventory", "assigned"].includes(device.status)) {
    if (device.userId && device.userId !== user.id) {
      return shell(
        <>
          <h1 className="mt-2 text-xl font-bold text-red-700">Assigned to another member</h1>
          <p className="mt-2 text-sm text-slate-600">
            This JourneyPort is assigned to a different member and cannot be
            activated on your account.
          </p>
        </>
      );
    }
    const activate = activateDeviceAction.bind(null, token);
    return shell(
      <>
        <h1 className="mt-2 text-xl font-bold text-slate-900">Activate your JourneyPort</h1>
        <p className="mt-2 text-sm text-slate-600">
          Device <span className="font-mono font-semibold">{device.publicDeviceId}</span>{" "}
          ({device.deviceType}) will be linked to your Journey identity. You
          confirm you are the owner of this physical JourneyPort.
        </p>
        <form action={activate} className="mt-5">
          <button className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 font-semibold text-white hover:bg-emerald-800">
            Confirm ownership & activate
          </button>
        </form>
      </>
    );
  }

  // Active device
  if (device.userId !== user.id) {
    return shell(
      <>
        <h1 className="mt-2 text-xl font-bold text-red-700">Not your JourneyPort</h1>
        <p className="mt-2 text-sm text-slate-600">
          This JourneyPort belongs to a different member.
        </p>
      </>
    );
  }

  if (sp.activated) {
    return shell(
      <>
        <h1 className="mt-2 text-xl font-bold text-emerald-700">✓ JourneyPort activated</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your JourneyPort <span className="font-mono">{device.publicDeviceId}</span> is now
          connected to your Journey identity{" "}
          <span className="font-mono">{device.user?.journeyIdentity?.publicId}</span>. Tap it at
          any Earthy Doing to record your participation.
        </p>
        <Link href="/journey" className="mt-5 block rounded-lg bg-emerald-700 px-4 py-2.5 text-center font-semibold text-white hover:bg-emerald-800">
          View my Journey
        </Link>
      </>
    );
  }

  // Resolve active Earthy Doings (TRS 25 — contextual interaction: card
  // identifies the participant, the event context identifies the activity)
  const now = new Date();
  const windowMs = 60 * 60 * 1000;
  const activeDoings = await db.earthyDoing.findMany({
    where: {
      status: { in: ["published", "active"] },
      startAt: { lte: new Date(now.getTime() + windowMs) },
      endAt: { gte: new Date(now.getTime() - windowMs) },
    },
    include: { partner: true, classifications: true, location: true },
    orderBy: { startAt: "asc" },
  });

  const participated = sp.participated
    ? activeDoings.find((d) => d.id === sp.participated)
    : null;

  return shell(
    <>
      <h1 className="mt-2 text-xl font-bold text-slate-900">
        Hi, {user.displayName.split(" ")[0]} 👋
      </h1>
      {sp.error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {sp.error === "EVENT_FULL"
            ? "This Earthy Doing has reached capacity."
            : sp.error === "EVENT_NOT_ACTIVE"
              ? "This Earthy Doing is not open for participation."
              : "Something went wrong recording your participation."}
        </p>
      )}
      {participated && (
        <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
          <p className="font-semibold">✓ Participation recorded</p>
          <p className="mt-1">
            {participated.title} — your participation is now awaiting partner
            verification.
          </p>
        </div>
      )}
      <p className="mt-2 text-sm text-slate-600">
        {activeDoings.length > 0
          ? "Select the Earthy Doing you are participating in right now:"
          : "There are no Earthy Doings happening right now."}
      </p>
      <div className="mt-4 space-y-3">
        {activeDoings.map((d) => {
          const participate = tapParticipateAction.bind(null, token, d.id);
          return (
            <form key={d.id} action={participate} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{d.title}</p>
                  <p className="text-xs text-slate-500">
                    {d.partner.name}
                    {d.location ? ` · ${d.location.name}` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {d.classifications.map((c) => (
                  <DimensionBadge key={c.id} dimension={c.dimension} />
                ))}
              </div>
              <button className="mt-3 w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
                Tap in — I&apos;m here
              </button>
            </form>
          );
        })}
      </div>
      <Link href="/journey" className="mt-6 block text-center text-sm font-medium text-emerald-700 hover:underline">
        View my Journey →
      </Link>
    </>
  );
}

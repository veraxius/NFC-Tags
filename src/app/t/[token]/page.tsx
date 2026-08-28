import Link from "next/link";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { hashNfcToken } from "@/lib/ids";
import { audit } from "@/lib/audit";
import { activateDeviceAction, tapParticipateAction } from "@/lib/actions";
import { DimensionBadge } from "@/components/ui";
import { OrganicCard, StatusPill, Headline } from "@/components/organic";

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
      <OrganicCard className="p-7">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-pink)]">
          Beaurity
        </p>
        {children}
      </OrganicCard>
    </main>
  );

  if (!device) {
    return shell(
      <>
        <Headline className="mt-2 text-xl">We couldn&apos;t find this JourneyPort</Headline>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          This tap didn&apos;t match anything we know. If you just got a new
          JourneyPort, ask the team that gave it to you — they can sort it out.
        </p>
      </>
    );
  }

  if (["revoked", "lost", "stolen", "suspended", "retired", "replaced"].includes(device.status)) {
    return shell(
      <>
        <Headline className="mt-2 text-xl">This JourneyPort is taking a break</Headline>
        <p className="mt-2 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          <StatusPill status={device.status} />
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          If this is yours, reach out and we&apos;ll get you a new one — your
          Journey and everything you&apos;ve done stays exactly as it is.
        </p>
      </>
    );
  }

  // Not signed in → authenticate first (TRS 24 step 6)
  if (!user) {
    return shell(
      <>
        <Headline className="mt-2 text-xl">Welcome!</Headline>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Sign in, or take a minute to create your Journey, and we&apos;ll pick
          up right where this tap left off.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link
            href={`/login?next=/t/${token}`}
            className="rounded-full bg-[var(--color-pink)] px-4 py-2.5 text-center font-semibold text-white hover:bg-[var(--color-pink-hover)]"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-full border border-[var(--color-warmgray)] px-4 py-2.5 text-center font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-alt)]"
          >
            Start my Journey
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
          <Headline className="mt-2 text-xl">This one&apos;s spoken for</Headline>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            This JourneyPort is already set up for someone else, so we can&apos;t
            connect it to your account.
          </p>
        </>
      );
    }
    const activate = activateDeviceAction.bind(null, token);
    return shell(
      <>
        <Headline className="mt-2 text-xl">Let&apos;s make this yours</Headline>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          This JourneyPort will be linked to your Journey from now on — every
          tap will count toward your story.
        </p>
        <form action={activate} className="mt-5">
          <button className="w-full rounded-full bg-[var(--color-pink)] px-4 py-2.5 font-semibold text-white hover:bg-[var(--color-pink-hover)]">
            Yes, this is mine
          </button>
        </form>
      </>
    );
  }

  // Active device
  if (device.userId !== user.id) {
    return shell(
      <>
        <Headline className="mt-2 text-xl">Not quite your JourneyPort</Headline>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          This one belongs to someone else&apos;s Journey.
        </p>
      </>
    );
  }

  if (sp.activated) {
    return shell(
      <>
        <Headline className="mt-2 text-xl text-[var(--color-pink)]">You&apos;re all set 🌱</Headline>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Your JourneyPort is connected. Tap it at any Earthy Doing from now on
          and it&apos;ll become part of your story.
        </p>
        <Link
          href="/journey"
          className="mt-5 block rounded-full bg-[var(--color-pink)] px-4 py-2.5 text-center font-semibold text-white hover:bg-[var(--color-pink-hover)]"
        >
          See my Journey
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
      <Headline className="mt-2 text-xl">
        Hi, {user.displayName.split(" ")[0]} 👋
      </Headline>
      {sp.error && (
        <p className="mt-2 rounded-2xl bg-[var(--color-plum-soft)] px-3 py-2 text-sm text-[var(--color-plum)]">
          {sp.error === "EVENT_FULL"
            ? "This one's full for now — thank you for showing up anyway."
            : sp.error === "EVENT_NOT_ACTIVE"
              ? "This isn't open for tapping in right now."
              : "That didn't quite go through — try tapping again."}
        </p>
      )}
      {participated && (
        <div className="mt-3 rounded-2xl bg-[var(--color-mint-soft)] px-4 py-3 text-sm text-[var(--color-mint-ink)]">
          <p className="font-semibold">✓ You&apos;re in!</p>
          <p className="mt-1">
            {participated.title} is on your Journey — {participated.partner.name} will confirm it shortly.
          </p>
        </div>
      )}
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        {activeDoings.length > 0
          ? "What are you here for today?"
          : "Nothing's happening right here right now — check back when an Earthy Doing starts."}
      </p>
      <div className="mt-4 space-y-3">
        {activeDoings.map((d) => {
          const participate = tapParticipateAction.bind(null, token, d.id);
          return (
            <OrganicCard key={d.id} accentDimension={d.classifications[0]?.dimension} className="p-4">
              <form action={participate}>
                <p className="font-semibold text-[var(--color-text)]">{d.title}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {d.partner.name}
                  {d.location ? ` · ${d.location.name}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {d.classifications.map((c) => (
                    <DimensionBadge key={c.id} dimension={c.dimension} />
                  ))}
                </div>
                <button className="mt-3 w-full rounded-full bg-[var(--color-pink)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-pink-hover)]">
                  Tap in — I&apos;m here
                </button>
              </form>
            </OrganicCard>
          );
        })}
      </div>
      <Link href="/journey" className="mt-6 block text-center text-sm font-medium text-[var(--color-pink)] hover:underline">
        See my Journey →
      </Link>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Headline, OrganicCard, StatusPill } from "@/components/organic";
import { Avatar } from "@/components/Avatar";
import { AutoUploadAvatar } from "@/components/AutoUploadAvatar";
import { sendMessageAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

// One profile page for everyone — a member, a partner admin, an Ops
// staffer. Cross-cutting like /settings/security, not owned by any single
// area's sidebar, since "click a person, see their profile" now happens
// from Explore, the People list, a conversation, anywhere.
export default async function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const session = await requireUser();
  const { userId } = await params;

  const person = await db.user.findUnique({
    where: { id: userId },
    include: { journeyIdentity: true },
  });
  if (!person) notFound();

  const isSelf = person.id === session.id;

  const participations = await db.participation.findMany({
    where: { userId: person.id },
    include: { earthyDoing: { include: { partner: true } } },
    orderBy: { checkInAt: "desc" },
    take: 10,
  });

  return (
    <main className="mx-auto min-h-screen max-w-lg px-6 py-12">
      <Link href="/" className="text-[13px] font-medium text-[var(--color-pink)] hover:underline">
        ‹ JourneyPort™
      </Link>

      <OrganicCard className="mt-4 p-6">
        <div className="flex items-center gap-4">
          <Avatar src={person.avatarUrl} position={person.avatarPosition} name={person.displayName ?? person.firstName} size={72} />
          <div>
            <Headline className="text-2xl">{person.displayName ?? `${person.firstName} ${person.lastName}`}</Headline>
            {person.journeyIdentity && (
              <p className="font-mono text-xs text-[var(--color-text-secondary)]">{person.journeyIdentity.publicId}</p>
            )}
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              Member since {person.createdAt.toLocaleDateString()}
            </p>
          </div>
        </div>

        {isSelf ? (
          <div className="mt-6 border-t border-black/5 pt-5">
            <AutoUploadAvatar />
          </div>
        ) : (
          <form action={sendMessageAction} className="mt-6 space-y-2 border-t border-black/5 pt-5">
            <input type="hidden" name="otherUserId" value={person.id} />
            <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
              Send {person.displayName?.split(" ")[0] ?? "them"} a message
            </label>
            <textarea
              name="body"
              required
              rows={3}
              placeholder="Say hello…"
              className="w-full rounded-2xl border border-[var(--color-warmgray)] px-3 py-2 text-sm focus:border-[var(--color-pink)] focus:outline-none"
            />
            <button className="rounded-full bg-[var(--color-pink)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-pink-hover)]">
              Send message
            </button>
          </form>
        )}
      </OrganicCard>

      <div className="mt-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Earthy Doings
        </h3>
        {participations.length === 0 ? (
          <OrganicCard className="p-5 text-sm text-[var(--color-text-secondary)]">
            {isSelf ? "You haven't" : `${person.displayName?.split(" ")[0] ?? "They"} hasn't`} tapped into any Earthy
            Doing yet.
          </OrganicCard>
        ) : (
          <div className="space-y-2">
            {participations.map((p) => (
              <Link key={p.id} href={`/journey/explore/${p.earthyDoing.id}`}>
                <OrganicCard className="flex flex-wrap items-center justify-between gap-2 p-4 transition-shadow hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
                  <div>
                    <p className="font-medium text-[var(--color-text)]">{p.earthyDoing.title}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {p.earthyDoing.partner.name} · {p.checkInAt.toLocaleDateString()}
                    </p>
                  </div>
                  <StatusPill status={p.status} />
                </OrganicCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

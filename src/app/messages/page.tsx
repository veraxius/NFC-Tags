import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listConversationsForUser } from "@/lib/messages";
import { Headline, OrganicCard } from "@/components/organic";
import { Avatar } from "@/components/Avatar";
import { NewMessageSearch } from "@/components/NewMessageSearch";

export const dynamic = "force-dynamic";

// Cross-cutting like /settings/security and /profile — messaging isn't a
// Member thing or an Organization thing, it's a person-to-person thing, so
// both sidebars link here rather than each area getting its own copy.
export default async function MessagesInbox() {
  const session = await requireUser();
  const conversations = await listConversationsForUser(session.id);

  return (
    <main className="mx-auto min-h-screen max-w-lg px-6 py-12">
      <Link href="/" className="text-[13px] font-medium text-[var(--color-pink)] hover:underline">
        ‹ JourneyPort™
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Headline className="text-2xl">Messages</Headline>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Direct conversations with other people on JourneyPort.
          </p>
        </div>
        <NewMessageSearch />
      </div>

      <div className="mt-6 space-y-2">
        {conversations.length === 0 ? (
          <OrganicCard className="p-6 text-sm text-[var(--color-text-secondary)]">
            No conversations yet. Use "+ New message" above to find someone by name.
          </OrganicCard>
        ) : (
          conversations.map((c) => (
            <Link key={c.id} href={`/messages/${c.publicId}`}>
              <OrganicCard className="flex items-center gap-3 p-4 transition-shadow hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
                <Avatar src={c.other.avatarUrl} position={c.other.avatarPosition} name={c.other.displayName ?? c.other.firstName} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-[var(--color-text)]">
                      {c.other.displayName ?? `${c.other.firstName} ${c.other.lastName}`}
                    </p>
                    <span className="shrink-0 text-xs text-[var(--color-text-secondary)]">
                      {c.lastMessageAt.toLocaleDateString()}
                    </span>
                  </div>
                  <p className="truncate text-sm text-[var(--color-text-secondary)]">
                    {c.lastMessage?.body ?? "No messages yet"}
                  </p>
                </div>
                {c.unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-pink)] px-1.5 text-[11px] font-semibold text-white">
                    {c.unreadCount}
                  </span>
                )}
              </OrganicCard>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getConversationForUser } from "@/lib/messages";
import { Headline, OrganicCard } from "@/components/organic";
import { Avatar } from "@/components/Avatar";
import { replyMessageAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function ConversationThread({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const { id } = await params;

  const data = await getConversationForUser(id, session.id);
  if (!data) notFound();
  const { conversation, other, messages } = data;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-6 py-12">
      <Link href="/messages" className="text-[13px] font-medium text-[var(--color-pink)] hover:underline">
        ‹ Messages
      </Link>

      <div className="mt-3 flex items-center gap-3">
        <Avatar src={other.avatarUrl} position={other.avatarPosition} name={other.displayName ?? other.firstName} size={44} />
        <div>
          <Headline className="text-xl">{other.displayName ?? `${other.firstName} ${other.lastName}`}</Headline>
          <Link href={`/profile/${other.id}`} className="text-xs text-[var(--color-pink)] hover:underline">
            View profile
          </Link>
        </div>
      </div>

      <div className="mt-6 flex-1 space-y-3">
        {messages.map((m) => {
          const fromMe = m.senderId === session.id;
          return (
            <div key={m.id} className={`flex ${fromMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  fromMe
                    ? "bg-[var(--color-pink)] text-white"
                    : "bg-[var(--color-bg-alt)] text-[var(--color-text)]"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-1 text-[10px] ${fromMe ? "text-white/70" : "text-[var(--color-text-secondary)]"}`}>
                  {m.createdAt.toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <OrganicCard className="sticky bottom-4 mt-6 p-3">
        <form action={replyMessageAction} className="flex items-end gap-2">
          <input type="hidden" name="conversationId" value={conversation.publicId} />
          <input type="hidden" name="otherUserId" value={other.id} />
          <textarea
            name="body"
            required
            rows={1}
            placeholder="Write a reply…"
            className="flex-1 resize-none rounded-2xl border border-[var(--color-warmgray)] px-3 py-2 text-sm focus:border-[var(--color-pink)] focus:outline-none"
          />
          <button className="shrink-0 rounded-full bg-[var(--color-pink)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-pink-hover)]">
            Send
          </button>
        </form>
      </OrganicCard>
    </main>
  );
}

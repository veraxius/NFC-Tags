import { db } from "./db";
import { audit } from "./audit";
import { notifyN8n } from "./webhooks";
import { SessionUser, actorTypeFor } from "./auth";
import { conversationPublicId } from "./ids";

export class MessageError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Every pair of people gets exactly one conversation, no matter who starts
// it — normalize the two ids into (smaller, larger) so a lookup always
// finds the same row, and let the DB's unique constraint be the actual
// guarantee against a duplicate under a race.
function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// Finds people to start a new conversation with, by the name they signed
// up with — first name, last name, or display name, whichever matches.
// Excludes the searcher themselves; capped since this backs a live-typing
// dropdown, not a full directory browse.
export async function searchPeople(query: string, excludeUserId: string) {
  const q = query.trim();
  if (q.length < 2) return [];
  return db.user.findMany({
    where: {
      id: { not: excludeUserId },
      status: "active",
      OR: [
        { displayName: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, displayName: true, firstName: true, lastName: true, avatarUrl: true, avatarPosition: true },
    take: 8,
    orderBy: { displayName: "asc" },
  });
}

export async function getOrCreateConversation(session: SessionUser, otherUserId: string) {
  if (otherUserId === session.id) {
    throw new MessageError("CANNOT_MESSAGE_SELF", "You can't start a conversation with yourself.");
  }
  const other = await db.user.findUnique({ where: { id: otherUserId } });
  if (!other) throw new MessageError("USER_NOT_FOUND", "That person doesn't exist.", 404);

  const [userAId, userBId] = orderPair(session.id, otherUserId);
  const existing = await db.conversation.findUnique({ where: { userAId_userBId: { userAId, userBId } } });
  if (existing) return existing;

  return db.conversation.create({
    data: { publicId: conversationPublicId(), userAId, userBId },
  });
}

export async function sendMessage(params: { session: SessionUser; otherUserId: string; body: string }) {
  const body = params.body.trim();
  if (!body) throw new MessageError("EMPTY_MESSAGE", "Message can't be empty.");
  if (body.length > 4000) throw new MessageError("MESSAGE_TOO_LONG", "That message is too long.");

  const conversation = await getOrCreateConversation(params.session, params.otherUserId);

  const message = await db.message.create({
    data: { conversationId: conversation.id, senderId: params.session.id, body },
  });
  await db.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: message.createdAt } });

  await audit({
    actorType: actorTypeFor(params.session),
    actorId: params.session.id,
    action: "message.sent",
    objectType: "message",
    objectId: message.id,
    newState: { conversationId: conversation.id, recipientId: params.otherUserId },
  });

  const recipient = await db.user.findUnique({ where: { id: params.otherUserId } });
  await notifyN8n("message.sent", {
    senderName: params.session.displayName,
    recipientName: recipient?.displayName ?? null,
    conversationId: conversation.publicId,
  });

  return { conversation, message };
}

// Every conversation this person is in, newest first, with the other
// participant's info and how many of their messages are still unread.
export async function listConversationsForUser(userId: string) {
  const conversations = await db.conversation.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    include: {
      userA: { include: { journeyIdentity: true } },
      userB: { include: { journeyIdentity: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  return Promise.all(
    conversations.map(async (c) => {
      const other = c.userAId === userId ? c.userB : c.userA;
      const unreadCount = await db.message.count({
        where: { conversationId: c.id, senderId: { not: userId }, readAt: null },
      });
      return {
        id: c.id,
        publicId: c.publicId,
        lastMessageAt: c.lastMessageAt,
        other,
        lastMessage: c.messages[0] ?? null,
        unreadCount,
      };
    })
  );
}

export async function countUnreadMessages(userId: string) {
  return db.message.count({
    where: { conversation: { OR: [{ userAId: userId }, { userBId: userId }] }, senderId: { not: userId }, readAt: null },
  });
}

// Loads a thread and, as a side effect of opening it, marks the other
// person's messages as read — the same "viewing it is acknowledging it"
// behavior most messaging UIs use, no separate "mark as read" action needed.
export async function getConversationForUser(idOrPublicId: string, userId: string) {
  const conversation = await db.conversation.findFirst({
    where: { OR: [{ id: idOrPublicId }, { publicId: idOrPublicId }] },
    include: { userA: { include: { journeyIdentity: true } }, userB: { include: { journeyIdentity: true } } },
  });
  if (!conversation) return null;
  if (conversation.userAId !== userId && conversation.userBId !== userId) return null;

  await db.message.updateMany({
    where: { conversationId: conversation.id, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });

  const messages = await db.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
  });

  const other = conversation.userAId === userId ? conversation.userB : conversation.userA;
  return { conversation, other, messages };
}

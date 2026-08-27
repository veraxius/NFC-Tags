import { z } from "zod";
import { db } from "@/lib/db";
import { ok, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";

// Architecture doc §22 — Notification. In-platform only for the MVP.
export const GET = handler(async () => {
  const session = await requireUser();
  const notifications = await db.notification.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return ok({
    unread_count: notifications.filter((n) => !n.readAt).length,
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      object_type: n.objectType,
      object_id: n.objectId,
      read_at: n.readAt,
      created_at: n.createdAt,
    })),
  });
});

const patchSchema = z.object({ ids: z.array(z.string()).optional() });

// Marks the given notifications (or all) as read for the signed-in member.
export const PATCH = handler(async (req: Request) => {
  const session = await requireUser();
  const body = patchSchema.parse(await req.json().catch(() => ({})));

  const result = await db.notification.updateMany({
    where: {
      userId: session.id,
      readAt: null,
      ...(body.ids ? { id: { in: body.ids } } : {}),
    },
    data: { readAt: new Date() },
  });

  return ok({ marked_read: result.count });
});

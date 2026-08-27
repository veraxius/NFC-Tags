import { ok, handler } from "@/lib/api";
import { requireUser, createSession } from "@/lib/auth";

// TRS 27 — POST /auth/refresh
// Issues a new short-lived session token for an already-authenticated caller.
export const POST = handler(async () => {
  const session = await requireUser();
  await createSession(session.id);
  return ok({ refreshed: true });
});

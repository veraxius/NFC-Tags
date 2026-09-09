import { ok, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { searchPeople } from "@/lib/messages";

// Backs the "New message" search box — any signed-in user can look up
// another person by the name they registered with, to start a conversation.
export const GET = handler(async (req: Request) => {
  const session = await requireUser();
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const people = await searchPeople(q, session.id);
  return ok({ people });
});

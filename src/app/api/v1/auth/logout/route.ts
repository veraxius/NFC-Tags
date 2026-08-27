import { ok, handler } from "@/lib/api";
import { destroySession } from "@/lib/auth";

export const POST = handler(async () => {
  await destroySession();
  return ok({ loggedOut: true });
});

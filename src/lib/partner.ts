import { db } from "./db";
import { SessionUser, isBeaurityAdmin } from "./auth";

// Resolves which partner a session is operating for.
// Partner staff → their partner; Beaurity admins → first partner (MVP pilot has 1-3).
export async function resolvePartnerFor(user: SessionUser) {
  if (user.partnerRoles.length > 0) {
    return db.partner.findUniqueOrThrow({ where: { id: user.partnerRoles[0].partnerId } });
  }
  if (isBeaurityAdmin(user)) {
    const first = await db.partner.findFirst({ orderBy: { createdAt: "asc" } });
    if (first) return first;
  }
  throw new Error("No partner context for this user");
}

import { db } from "@/lib/db";
import { ok, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const GET = handler(async () => {
  const session = await requireUser();
  const user = await db.user.findUniqueOrThrow({
    where: { id: session.id },
    include: { journeyIdentity: true },
  });
  return ok({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    journeyId: user.journeyIdentity?.publicId,
    profileVisibility: user.journeyIdentity?.profileVisibility,
    platformRole: user.platformRole,
  });
});

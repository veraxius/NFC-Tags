import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { transitionEarthyDoing, EarthyDoingError } from "@/lib/earthyDoings";

// TRS 44 — the Earthy Doings screen exposes a Pause action alongside
// Publish / Cancel / Archive.
export const POST = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  try {
    const doing = await transitionEarthyDoing({ session, idOrPublicId: id, to: "paused" });
    return ok({ id: doing.publicId, status: doing.status });
  } catch (e) {
    if (e instanceof EarthyDoingError) return fail(e.code, e.message, e.status);
    throw e;
  }
});

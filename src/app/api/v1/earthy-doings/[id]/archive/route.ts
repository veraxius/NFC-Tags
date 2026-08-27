import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { transitionEarthyDoing, EarthyDoingError } from "@/lib/earthyDoings";

// TRS 30 — POST /earthy-doings/{id}/archive
export const POST = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  try {
    const doing = await transitionEarthyDoing({ session, idOrPublicId: id, to: "archived" });
    return ok({ id: doing.publicId, status: doing.status });
  } catch (e) {
    if (e instanceof EarthyDoingError) return fail(e.code, e.message, e.status);
    throw e;
  }
});

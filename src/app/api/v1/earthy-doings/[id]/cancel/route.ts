import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { transitionEarthyDoing, EarthyDoingError } from "@/lib/earthyDoings";

const schema = z.object({ reason: z.string().optional() });

// TRS 30 — POST /earthy-doings/{id}/cancel
export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  const body = schema.parse(await req.json().catch(() => ({})));
  try {
    const doing = await transitionEarthyDoing({
      session,
      idOrPublicId: id,
      to: "cancelled",
      reason: body.reason,
    });
    return ok({ id: doing.publicId, status: doing.status });
  } catch (e) {
    if (e instanceof EarthyDoingError) return fail(e.code, e.message, e.status);
    throw e;
  }
});

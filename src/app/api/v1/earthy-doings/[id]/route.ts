import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser, isBeaurityAdmin, canActForPartner } from "@/lib/auth";
import { resolveEarthyDoing, updateEarthyDoing, EarthyDoingError } from "@/lib/earthyDoings";

// TRS 30 — GET /earthy-doings/{id}
export const GET = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireUser();
  const { id } = await ctx.params;

  const doing = await db.earthyDoing.findFirst({
    where: { OR: [{ id }, { publicId: id }] },
    include: {
      partner: true,
      classifications: true,
      location: true,
      program: true,
      verificationPolicy: true,
      _count: { select: { participations: true, milestones: true } },
    },
  });
  if (!doing) return fail("EVENT_NOT_FOUND", "Earthy Doing not found.", 404);

  // Drafts are only visible to the owning partner and Beaurity admins.
  const visible =
    ["published", "active", "completed"].includes(doing.status) ||
    isBeaurityAdmin(session) ||
    canActForPartner(session, doing.partnerId);
  if (!visible) return fail("EVENT_NOT_FOUND", "Earthy Doing not found.", 404);

  return ok({
    id: doing.publicId,
    title: doing.title,
    description: doing.description,
    category: doing.category,
    status: doing.status,
    start_at: doing.startAt,
    end_at: doing.endAt,
    capacity: doing.capacity,
    partner: { id: doing.partner.publicId, name: doing.partner.name },
    program: doing.program ? { id: doing.program.publicId, name: doing.program.name } : null,
    location: doing.location ? { name: doing.location.name, address: doing.location.address } : null,
    verification_policy: doing.verificationPolicy
      ? {
          id: doing.verificationPolicy.publicId,
          name: doing.verificationPolicy.name,
          version: doing.verificationPolicy.version,
          requires_nfc: doing.verificationPolicy.requiresNfc,
          requires_partner_confirmation: doing.verificationPolicy.requiresPartnerConfirm,
          requires_aim: doing.verificationPolicy.requiresAim,
        }
      : null,
    trisilience: doing.classifications.map((c) => c.dimension),
    participation_count: doing._count.participations,
    verified_milestone_count: doing._count.milestones,
  });
});

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  start_at: z.string().optional(),
  end_at: z.string().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  location_id: z.string().nullable().optional(),
  program_id: z.string().nullable().optional(),
  trisilience: z.array(z.string()).optional(),
});

// TRS 30 — PATCH /earthy-doings/{id}
export const PATCH = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  const body = patchSchema.parse(await req.json());

  try {
    await resolveEarthyDoing(id);
    const updated = await updateEarthyDoing({
      session,
      idOrPublicId: id,
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
        ...(body.start_at !== undefined ? { startAt: new Date(body.start_at) } : {}),
        ...(body.end_at !== undefined ? { endAt: new Date(body.end_at) } : {}),
        ...(body.capacity !== undefined ? { capacity: body.capacity } : {}),
        ...(body.location_id !== undefined ? { locationId: body.location_id } : {}),
        ...(body.program_id !== undefined ? { programId: body.program_id } : {}),
        ...(body.trisilience !== undefined ? { dimensions: body.trisilience } : {}),
      },
    });
    return ok({
      id: updated.publicId,
      title: updated.title,
      status: updated.status,
      trisilience: updated.classifications.map((c) => c.dimension),
    });
  } catch (e) {
    if (e instanceof EarthyDoingError) return fail(e.code, e.message, e.status);
    throw e;
  }
});

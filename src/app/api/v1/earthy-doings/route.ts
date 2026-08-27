import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser, isBeaurityAdmin } from "@/lib/auth";
import { createEarthyDoing, EarthyDoingError } from "@/lib/earthyDoings";

// TRS 30 — GET /earthy-doings
// Members see published/active activities; partner staff and Beaurity admins
// additionally see their own drafts and archived records (TRS §38).
export const GET = handler(async (req: Request) => {
  const session = await requireUser();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const partnerPublicId = url.searchParams.get("partner");

  const partnerIds = session.partnerRoles.map((r) => r.partnerId);
  const isAdmin = isBeaurityAdmin(session);

  const doings = await db.earthyDoing.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(partnerPublicId ? { partner: { publicId: partnerPublicId } } : {}),
      ...(isAdmin
        ? {}
        : {
            OR: [
              { status: { in: ["published", "active"] } },
              ...(partnerIds.length > 0 ? [{ partnerId: { in: partnerIds } }] : []),
            ],
          }),
    },
    include: { partner: true, classifications: true, location: true },
    orderBy: { startAt: "desc" },
    take: 200,
  });

  return ok(
    doings.map((d) => ({
      id: d.publicId,
      title: d.title,
      description: d.description,
      category: d.category,
      status: d.status,
      start_at: d.startAt,
      end_at: d.endAt,
      capacity: d.capacity,
      partner: { id: d.partner.publicId, name: d.partner.name },
      location: d.location ? { name: d.location.name } : null,
      trisilience: d.classifications.map((c) => c.dimension),
    }))
  );
});

const postSchema = z.object({
  partner_id: z.string().min(1),
  program_id: z.string().optional(),
  title: z.string().min(1),
  description: z.string().default(""),
  category: z.string().default("general"),
  start_at: z.string(),
  end_at: z.string(),
  location_id: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  trisilience: z.array(z.string()).min(1),
  verification_policy_id: z.string().optional(),
  publish: z.boolean().default(false),
});

// TRS 30 — POST /earthy-doings
export const POST = handler(async (req: Request) => {
  const session = await requireUser();
  const body = postSchema.parse(await req.json());

  const partner = await db.partner.findFirst({
    where: { OR: [{ id: body.partner_id }, { publicId: body.partner_id }] },
  });
  if (!partner) return fail("PARTNER_NOT_FOUND", "Partner not found.", 404);

  try {
    const doing = await createEarthyDoing({
      session,
      partnerId: partner.id,
      programId: body.program_id ?? null,
      title: body.title,
      description: body.description,
      category: body.category,
      startAt: new Date(body.start_at),
      endAt: new Date(body.end_at),
      locationId: body.location_id ?? null,
      capacity: body.capacity ?? null,
      dimensions: body.trisilience,
      verificationPolicyId: body.verification_policy_id ?? null,
      status: body.publish ? "published" : "draft",
    });
    return ok(
      {
        id: doing.publicId,
        title: doing.title,
        status: doing.status,
        trisilience: doing.classifications.map((c) => c.dimension),
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof EarthyDoingError) return fail(e.code, e.message, e.status);
    throw e;
  }
});

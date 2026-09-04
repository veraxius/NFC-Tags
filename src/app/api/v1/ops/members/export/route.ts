import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isBeaurityAdmin, AuthError } from "@/lib/auth";
import { buildMemberWhere } from "@/lib/members";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  let session;
  try {
    session = await requireUser();
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
  if (!isBeaurityAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const where = buildMemberWhere({
    status: searchParams.get("status") ?? undefined,
    partner: searchParams.get("partner") ?? undefined,
    since: searchParams.get("since") ?? undefined,
    device: searchParams.get("device") ?? undefined,
    milestones: searchParams.get("milestones") ?? undefined,
  });

  const members = await db.user.findMany({
    where,
    include: {
      journeyIdentity: true,
      devices: { where: { status: "active" } },
      _count: { select: { milestones: { where: { status: "verified" } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  const csv = toCsv(
    ["Name", "Email", "Journey ID", "Joined", "Active devices", "Verified milestones", "Last login", "Status"],
    members.map((m) => [
      m.displayName ?? `${m.firstName} ${m.lastName}`,
      m.email,
      m.journeyIdentity?.publicId ?? "",
      m.createdAt.toISOString().slice(0, 10),
      m.devices.length,
      m._count.milestones,
      m.lastLoginAt ? m.lastLoginAt.toISOString().slice(0, 10) : "",
      m.status,
    ])
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="members.csv"`,
    },
  });
}

import type { Prisma } from "@prisma/client";

export type MemberFilters = {
  status?: string;
  partner?: string;
  since?: string;
  device?: string;
  milestones?: string;
};

// Shared by the Ops Members screen and its CSV export, so an export always
// matches exactly what's currently on screen — not a separate, driftable
// copy of the same filter logic.
export function buildMemberWhere(sp: MemberFilters): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = { platformRole: "member" };
  if (sp.status) where.status = sp.status;
  if (sp.since) {
    const days = Number(sp.since);
    if (Number.isFinite(days)) {
      where.createdAt = { gte: new Date(Date.now() - days * 864e5) };
    }
  }
  if (sp.partner) {
    where.participations = { some: { partner: { publicId: sp.partner } } };
  }
  if (sp.device) {
    where.devices = sp.device === "none" ? { none: {} } : { some: { status: sp.device } };
  }
  if (sp.milestones === "with") where.milestones = { some: { status: "verified" } };
  if (sp.milestones === "without") where.milestones = { none: { status: "verified" } };
  return where;
}

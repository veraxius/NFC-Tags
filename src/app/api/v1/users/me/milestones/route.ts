import { db } from "@/lib/db";
import { ok, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const GET = handler(async () => {
  const session = await requireUser();
  const milestones = await db.journeyMilestone.findMany({
    where: { userId: session.id },
    orderBy: { earnedAt: "desc" },
    include: {
      earthyDoing: { include: { partner: true, classifications: true } },
      verification: { include: { aimAssessment: true, evidence: true } },
    },
  });
  return ok(
    milestones.map((m) => ({
      id: m.publicId,
      status: m.status,
      earnedAt: m.earnedAt,
      verifiedAt: m.verifiedAt,
      earthyDoing: {
        id: m.earthyDoing.publicId,
        title: m.earthyDoing.title,
        partner: m.earthyDoing.partner.name,
        trisilience: m.earthyDoing.classifications.map((c) => c.dimension),
      },
      verification: {
        status: m.verification.status,
        evidenceTypes: m.verification.evidence.map((e) => e.evidenceType),
        aim: m.verification.aimAssessment
          ? {
              result: m.verification.aimAssessment.assessmentResult,
              confidence: m.verification.aimAssessment.confidence,
            }
          : null,
      },
    }))
  );
});

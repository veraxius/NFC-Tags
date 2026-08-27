// One-off additive backfill for the schema additions (Program,
// VerificationPolicy, Dispute.publicId). Safe to re-run: every step is an
// upsert or a guarded update, and nothing existing is deleted.
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const db = new PrismaClient();

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const code = (n: number) =>
  Array.from(crypto.randomBytes(n), (b) => ALPHABET[b % ALPHABET.length]).join("");

async function main() {
  // 1. Default verification policy (TRS §37)
  const policy = await db.verificationPolicy.upsert({
    where: { publicId: "VPOL-PILOT1" },
    create: {
      publicId: "VPOL-PILOT1",
      name: "Pilot Standard Verification",
      version: "1.0",
      requiresNfc: true,
      requiresPartnerConfirm: true,
      requiresAim: true,
      minAimConfidence: 1.0,
      isDefault: true,
    },
    update: { isDefault: true },
  });
  console.log("verification policy:", policy.publicId);

  // 2. Attach the policy to every Earthy Doing that has none
  const attached = await db.earthyDoing.updateMany({
    where: { verificationPolicyId: null },
    data: { verificationPolicyId: policy.id },
  });
  console.log("earthy doings linked to policy:", attached.count);

  // 3. Demo program for the pilot partner, if that partner exists
  const partner = await db.partner.findFirst({ where: { publicId: "PTR-OCEAN1" } });
  if (partner) {
    const admin = await db.partnerUser.findFirst({
      where: { partnerId: partner.id, role: "administrator" },
    });
    const program = await db.program.upsert({
      where: { publicId: "PRG-OCEAN1" },
      create: {
        publicId: "PRG-OCEAN1",
        partnerId: partner.id,
        name: "Coastal Regeneration 2026",
        description:
          "Year-long program of coastal cleanups, workshops and wellness activities.",
        status: "active",
        createdBy: admin?.userId ?? partner.id,
      },
      update: {},
    });
    const linked = await db.earthyDoing.updateMany({
      where: { partnerId: partner.id, programId: null },
      data: { programId: program.id },
    });
    console.log("program:", program.publicId, "| earthy doings linked:", linked.count);
  }

  // 4. Public ids for any disputes created before the column existed
  const disputes = await db.dispute.findMany({ where: { publicId: "" } });
  for (const d of disputes) {
    await db.dispute.update({ where: { id: d.id }, data: { publicId: `DSP-${code(6)}` } });
  }
  if (disputes.length) console.log("disputes given public ids:", disputes.length);

  console.log("Backfill complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

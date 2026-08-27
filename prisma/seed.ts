// Demo/pilot seed — TRS 57 pilot target: 1 NFC form factor, 1 partner org,
// members, 3+ Earthy Doing types, 3 TriSilience dimensions.
// Demo NFC tokens are FIXED strings so they can be printed in the README and
// written to physical cards for the demo. In production, tokens are random.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const db = new PrismaClient();

const hashToken = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

const DEMO_TOKENS = {
  ana: "demo-ana-card-4vN7m2P8xQK1",
  luis: "demo-luis-card-9wR3t5Y2bMf7",
  fresh1: "demo-unassigned-card-6hJ4k8L1cD3z",
  fresh2: "demo-unassigned-card-2sF7g9H5nB8x",
};

async function main() {
  const password = await bcrypt.hash("Password123!", 12);

  // ---- Verification policy (TRS §37 / Architecture §11) ----
  // The pilot uses a single policy: NFC + partner confirmation + AIM.
  const policy = await db.verificationPolicy.create({
    data: {
      publicId: "VPOL-PILOT1",
      name: "Pilot Standard Verification",
      version: "1.0",
      requiresNfc: true,
      requiresPartnerConfirm: true,
      requiresAim: true,
      minAimConfidence: 1.0,
      isDefault: true,
    },
  });

  // ---- Platform staff ----
  const superAdmin = await db.user.create({
    data: {
      email: "superadmin@beaurity.demo",
      passwordHash: password,
      firstName: "Sysadmin",
      lastName: "Beaurity",
      displayName: "Super Admin",
      status: "active",
      emailVerified: true,
      platformRole: "super_admin",
      journeyIdentity: { create: { publicId: "JP-US-SUPERADM1" } },
    },
  });
  const opsAdmin = await db.user.create({
    data: {
      email: "ops@beaurity.demo",
      passwordHash: password,
      firstName: "Olivia",
      lastName: "Operations",
      displayName: "Olivia Operations",
      status: "active",
      emailVerified: true,
      platformRole: "beaurity_admin",
      journeyIdentity: { create: { publicId: "JP-US-OPSADMIN1" } },
    },
  });

  // ---- Partner org (approved) ----
  const partner = await db.partner.create({
    data: {
      name: "Ocean Guardians Foundation",
      publicId: "PTR-OCEAN1",
      type: "ngo",
      status: "active",
      website: "https://oceanguardians.example.org",
      country: "US",
      timezone: "America/New_York",
      verificationLevel: 3,
      approvedAt: new Date(),
    },
  });
  const location = await db.location.create({
    data: {
      partnerId: partner.id,
      name: "Miami Beach — 5th Street Access",
      address: "5th St & Ocean Dr, Miami Beach, FL",
      latitude: 25.7735,
      longitude: -80.1318,
      verificationRadiusM: 300,
      timezone: "America/New_York",
    },
  });

  const partnerAdmin = await db.user.create({
    data: {
      email: "admin@oceanguardians.demo",
      passwordHash: password,
      firstName: "Paula",
      lastName: "Partner",
      displayName: "Paula Partner",
      status: "active",
      emailVerified: true,
      journeyIdentity: { create: { publicId: "JP-US-PTRADMIN1" } },
    },
  });
  const operator = await db.user.create({
    data: {
      email: "operator@oceanguardians.demo",
      passwordHash: password,
      firstName: "Omar",
      lastName: "Operator",
      displayName: "Omar Operator",
      status: "active",
      emailVerified: true,
      journeyIdentity: { create: { publicId: "JP-US-OPERATOR1" } },
    },
  });
  await db.partnerUser.createMany({
    data: [
      { partnerId: partner.id, userId: partnerAdmin.id, role: "administrator" },
      { partnerId: partner.id, userId: operator.id, role: "operator" },
    ],
  });

  // ---- Members ----
  const consents = {
    create: [
      { consentType: "terms", policyVersion: "1.0", granted: true, grantedAt: new Date() },
      { consentType: "data_processing", policyVersion: "1.0", granted: true, grantedAt: new Date() },
    ],
  };
  const ana = await db.user.create({
    data: {
      email: "ana@member.demo",
      passwordHash: password,
      firstName: "Ana",
      lastName: "Torres",
      displayName: "Ana Torres",
      status: "active",
      emailVerified: true,
      journeyIdentity: { create: { publicId: "JP-US-K7M9Q2X4" } },
      consents,
    },
  });
  const luis = await db.user.create({
    data: {
      email: "luis@member.demo",
      passwordHash: password,
      firstName: "Luis",
      lastName: "Rivera",
      displayName: "Luis Rivera",
      status: "active",
      emailVerified: true,
      journeyIdentity: { create: { publicId: "JP-US-B4N8V6T2" } },
      consents,
    },
  });

  // ---- NFC devices ----
  const anaCard = await db.journeyPortDevice.create({
    data: {
      publicDeviceId: "JPD-ANA001",
      tokenHash: hashToken(DEMO_TOKENS.ana),
      deviceType: "card",
      userId: ana.id,
      status: "active",
      issuedAt: new Date(Date.now() - 7 * 864e5),
      activatedAt: new Date(Date.now() - 6 * 864e5),
    },
  });
  await db.journeyPortDevice.create({
    data: {
      publicDeviceId: "JPD-LUIS01",
      tokenHash: hashToken(DEMO_TOKENS.luis),
      deviceType: "card",
      userId: luis.id,
      status: "assigned", // Luis has not activated yet — demo of activation flow
      issuedAt: new Date(Date.now() - 3 * 864e5),
    },
  });
  await db.journeyPortDevice.createMany({
    data: [
      { publicDeviceId: "JPD-INV001", tokenHash: hashToken(DEMO_TOKENS.fresh1), deviceType: "card", status: "inventory" },
      { publicDeviceId: "JPD-INV002", tokenHash: hashToken(DEMO_TOKENS.fresh2), deviceType: "card", status: "inventory" },
    ],
  });

  // ---- Program (Architecture doc §22) ----
  const program = await db.program.create({
    data: {
      publicId: "PRG-OCEAN1",
      partnerId: partner.id,
      name: "Coastal Regeneration 2026",
      description: "Year-long program of coastal cleanups, workshops and wellness activities.",
      status: "active",
      createdBy: partnerAdmin.id,
    },
  });

  // ---- Earthy Doings ----
  const now = Date.now();
  const cleanup = await db.earthyDoing.create({
    data: {
      publicId: "ED-2026-MBC001",
      partnerId: partner.id,
      programId: program.id,
      title: "Miami Beach Cleanup",
      description: "Community beach cleanup — remove plastics and debris from the 5th Street access.",
      category: "environmental",
      status: "active",
      startAt: new Date(now - 2 * 3600e3),
      endAt: new Date(now + 6 * 3600e3),
      locationId: location.id,
      capacity: 100,
      verificationPolicyId: policy.id,
      createdBy: partnerAdmin.id,
      classifications: { create: [{ dimension: "ENVIRONMENTAL_EQUITY" }] },
    },
  });
  await db.earthyDoing.create({
    data: {
      publicId: "ED-2026-WEL001",
      partnerId: partner.id,
      programId: program.id,
      title: "Community Wellness Walk",
      description: "Guided group walk focused on wellbeing and connection.",
      category: "health",
      status: "published",
      startAt: new Date(now + 1 * 3600e3),
      endAt: new Date(now + 5 * 3600e3),
      locationId: location.id,
      verificationPolicyId: policy.id,
      createdBy: partnerAdmin.id,
      classifications: {
        create: [{ dimension: "SELF_SUSTAINABILITY" }, { dimension: "EMOTIONAL_PROSPERITY" }],
      },
    },
  });
  await db.earthyDoing.create({
    data: {
      publicId: "ED-2026-EDU001",
      partnerId: partner.id,
      programId: program.id,
      title: "Ocean Literacy Workshop",
      description: "Educational workshop on marine ecosystems and plastic reduction.",
      category: "education",
      status: "draft",
      startAt: new Date(now + 7 * 864e5),
      endAt: new Date(now + 7 * 864e5 + 3 * 3600e3),
      locationId: location.id,
      verificationPolicyId: policy.id,
      createdBy: partnerAdmin.id,
      classifications: {
        create: [{ dimension: "SELF_SUSTAINABILITY" }, { dimension: "ENVIRONMENTAL_EQUITY" }],
      },
    },
  });

  // ---- One fully verified transaction (the MVP end-to-end proof, TRS 56) ----
  const participation = await db.participation.create({
    data: {
      publicId: "PART-DEMO0001",
      earthyDoingId: cleanup.id,
      userId: ana.id,
      deviceId: anaCard.id,
      partnerId: partner.id,
      interactionType: "nfc",
      checkInAt: new Date(now - 90 * 60e3),
      checkOutAt: new Date(now - 30 * 60e3),
      locationId: location.id,
      status: "completed",
    },
  });
  const verification = await db.verification.create({
    data: {
      participationId: participation.id,
      partnerId: partner.id,
      status: "verified",
      verificationMethod: "nfc+partner_confirmation",
      verifiedBy: operator.id,
      verifiedAt: new Date(now - 20 * 60e3),
      evidence: {
        create: [
          { evidenceType: "nfc_tap", source: "journeyport_nfc", metadata: JSON.stringify({ device: "JPD-ANA001" }) },
          { evidenceType: "timestamp", source: "journeyport_platform", metadata: "{}" },
          { evidenceType: "partner_confirmation", source: "partner_dashboard", metadata: JSON.stringify({ confirmedBy: "operator" }) },
        ],
      },
    },
  });
  const assessment = await db.aimAssessment.create({
    data: {
      verificationId: verification.id,
      aimRequestId: "JP-AIM-DEMO000001",
      status: "completed",
      assessmentResult: "credible",
      confidence: 1.0,
      explanation: JSON.stringify({
        summary: "All required verification signals are present and consistent.",
        factors: [
          { signal: "nfc_interaction", present: true, weight: 0.35 },
          { signal: "partner_confirmation", present: true, weight: 0.35 },
          { signal: "timestamp_within_event_window", present: true, weight: 0.15 },
          { signal: "partner_approved_status", present: true, weight: 0.15 },
        ],
      }),
      modelVersion: "aim-internal-mvp-0.1",
      completedAt: new Date(now - 19 * 60e3),
    },
  });
  await db.journeyMilestone.create({
    data: {
      publicId: "JM-DEMO0001",
      userId: ana.id,
      earthyDoingId: cleanup.id,
      participationId: participation.id,
      verificationId: verification.id,
      aimAssessmentId: assessment.id,
      status: "verified",
      earnedAt: participation.checkInAt,
      verifiedAt: new Date(now - 19 * 60e3),
    },
  });

  // Audit trail for the seeded chain
  const auditRows = [
    { actorType: "system", action: "seed.database_initialized", objectType: "system", objectId: "seed" },
    { actorType: "member", actorId: ana.id, action: "user.registered", objectType: "user", objectId: ana.id },
    { actorType: "member", actorId: ana.id, action: "device.activated", objectType: "journeyport_device", objectId: anaCard.id },
    { actorType: "member", actorId: ana.id, action: "participation.recorded", objectType: "participation", objectId: participation.id },
    { actorType: "partner_operator", actorId: operator.id, action: "participation.completed", objectType: "participation", objectId: participation.id },
    { actorType: "partner_operator", actorId: operator.id, action: "verification.approved", objectType: "verification", objectId: verification.id },
    { actorType: "aim", action: "aim.assessment_completed", objectType: "aim_assessment", objectId: assessment.id },
    { actorType: "system", action: "milestone.verified", objectType: "journey_milestone", objectId: "JM-DEMO0001" },
  ];
  for (const row of auditRows) await db.auditEvent.create({ data: row });

  console.log("Seed complete.");
  console.log("Demo NFC tap URLs (open in browser to simulate a card tap):");
  for (const [name, token] of Object.entries(DEMO_TOKENS)) {
    console.log(`  ${name.padEnd(8)} http://localhost:3000/t/${token}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

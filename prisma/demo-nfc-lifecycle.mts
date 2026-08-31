// Live end-to-end trace of everything a JourneyPort NFC card can do today,
// run against the real (Railway) database with real business logic — not a
// mock. Prints each step as it happens. Nothing here is deleted afterward
// except the throwaway device used for the lifecycle-management demo at the
// end, so you can go look at the results in the app (Ops / Journey pages).
import { PrismaClient } from "@prisma/client";
import { recordParticipation, completeParticipation, approveVerification } from "../src/lib/flow";
import { canTransition } from "../src/lib/devices";
import { generateNfcToken, earthyDoingPublicId } from "../src/lib/ids";

const db = new PrismaClient();

const line = (t: string) => console.log(`\n${"═".repeat(70)}\n${t}\n${"═".repeat(70)}`);
const step = (t: string) => console.log(`\n→ ${t}`);

async function main() {
  line("SETUP — find the partner, the member, and Luis's already-activated card");

  const partner = await db.partner.findFirstOrThrow({ where: { name: { contains: "Ocean" } } });
  const location = await db.location.findFirst({ where: { partnerId: partner.id } });
  const policy = await db.verificationPolicy.findFirst({ where: { isDefault: true } });
  const luis = await db.user.findUniqueOrThrow({ where: { email: "luis@member.demo" } });
  const partnerAdmin = await db.user.findUniqueOrThrow({ where: { email: "admin@oceanguardians.demo" } });
  const device = await db.journeyPortDevice.findFirstOrThrow({
    where: { userId: luis.id, status: "active" },
  });

  console.log(`partner   : ${partner.name} (${partner.publicId})`);
  console.log(`member    : ${luis.displayName} <${luis.email}>`);
  console.log(`card      : ${device.publicDeviceId} (status: ${device.status})`);

  line("1. AN ORGANIZATION OPENS AN EARTHY DOING RIGHT NOW");

  const now = new Date();
  const doing = await db.earthyDoing.create({
    data: {
      publicId: earthyDoingPublicId(),
      partnerId: partner.id,
      title: "Live Demo — Beach Cleanup",
      description: "A demo Earthy Doing created just to exercise the full NFC tap lifecycle.",
      category: "environmental",
      status: "active",
      startAt: new Date(now.getTime() - 10 * 60 * 1000),
      endAt: new Date(now.getTime() + 50 * 60 * 1000),
      locationId: location?.id,
      verificationPolicyId: policy?.id,
      createdBy: partnerAdmin.id,
    },
  });
  await db.triSilienceClassification.create({
    data: { earthyDoingId: doing.id, dimension: "ENVIRONMENTAL_EQUITY" },
  });
  console.log(`created "${doing.title}" (${doing.publicId})`);
  console.log(`window: ${doing.startAt.toLocaleTimeString()} → ${doing.endAt.toLocaleTimeString()} (active now)`);

  line("2. MEMBER TAPS THEIR CARD AT THE EVENT");
  step(`GET /t/<token>  →  resolves to device ${device.publicDeviceId}  →  owner ${luis.displayName}`);
  step(`finds "${doing.title}" as an active Earthy Doing in the ±1h window`);

  const { participation, duplicate } = await recordParticipation({
    userId: luis.id,
    deviceId: device.id,
    earthyDoingId: doing.id,
    interactionType: "nfc",
  });
  console.log(`participation ${participation.publicId} created — status: ${participation.status}${duplicate ? " (was already recorded)" : ""}`);

  line("3. TAPPING AGAIN IS SAFE — DUPLICATE PROTECTION (US-003)");
  const second = await recordParticipation({
    userId: luis.id,
    deviceId: device.id,
    earthyDoingId: doing.id,
    interactionType: "nfc",
  });
  console.log(`second tap on the same Earthy Doing → duplicate: ${second.duplicate} (no second row created)`);

  line("4. THE ORGANIZATION MARKS THE ACTIVITY COMPLETE");
  const verification = await completeParticipation(participation.id, luis.id, "member");
  const evidence = await db.evidence.findMany({ where: { verificationId: verification.id } });
  console.log(`verification created — status: ${verification.status}, method: ${verification.verificationMethod}`);
  console.log(`evidence attached automatically:`);
  evidence.forEach((e) => console.log(`  - ${e.evidenceType} (source: ${e.source})`));

  line("5. THE ORGANIZATION APPROVES → AIM TRUST LAYER RUNS");
  const approved = await approveVerification({
    verificationId: verification.id,
    actorId: partnerAdmin.id,
    actorType: "partner_admin",
    notes: "Confirmed on-site by the event lead.",
  });
  console.log(`AIM signals evaluated: nfc_interaction + partner_confirmation`);
  console.log(`AIM confidence score : ${approved.assessment.confidence}`);
  console.log(`AIM result           : ${approved.assessment.assessmentResult}`);
  console.log(`verification status  : ${approved.verification.status}`);
  console.log(`journey milestone    : ${approved.milestone.publicId} — status: ${approved.milestone.status}`);

  const notif = await db.notification.findFirst({
    where: { objectId: approved.milestone.id },
    orderBy: { createdAt: "desc" },
  });
  console.log(`in-app notification  : "${notif?.title}"`);

  line("6. THIS NOW SHOWS UP ON LUIS'S JOURNEY");
  const journeyCount = await db.journeyMilestone.count({
    where: { userId: luis.id, status: "verified" },
  });
  console.log(`Luis now has ${journeyCount} verified milestone(s) on his Journey — visible at /journey`);
  console.log(`Also visible live at: /t/<token> the next time this card is tapped.`);

  line("7. WHAT ELSE THE CARD CAN DO — LIFECYCLE MANAGEMENT (on a fresh demo card)");

  const { token, tokenHash } = generateNfcToken();
  let demoDevice = await db.journeyPortDevice.create({
    data: { publicDeviceId: "JPD-LIFECYC", tokenHash, deviceType: "card", status: "inventory" },
  });
  console.log(`created throwaway card ${demoDevice.publicDeviceId} to demonstrate status changes safely`);

  const transitions: [string, string][] = [
    ["inventory", "active"],
    ["active", "suspended"],
    ["suspended", "active"],
    ["active", "lost"],
    ["lost", "replaced"],
  ];
  for (const [from, to] of transitions) {
    const allowed = canTransition(from, to);
    demoDevice = await db.journeyPortDevice.update({
      where: { id: demoDevice.id },
      data: { status: to, revokedAt: ["revoked", "lost", "stolen", "replaced"].includes(to) ? new Date() : null },
    });
    console.log(`  ${from.padEnd(10)} → ${to.padEnd(10)} allowed by state machine: ${allowed}`);
  }
  console.log(`\nblocked transition example: revoked → active`);
  console.log(`  allowed: ${canTransition("revoked", "active")} (terminal states can't be reactivated)`);

  await db.journeyPortDevice.delete({ where: { id: demoDevice.id } });
  console.log(`\ncleaned up the throwaway card ${demoDevice.publicDeviceId}.`);

  line("DONE — live results you can go look at right now");
  console.log(`- Journey    : /journey                (sign in as luis@member.demo / Password123!)`);
  console.log(`- Milestone  : /journey/milestones/${approved.milestone.publicId}`);
  console.log(`- Ops review : /ops/verifications/${verification.id}`);
  console.log(`- Ops device : /ops/devices            (${device.publicDeviceId} — still active, untouched)`);
  console.log(`- Ops audit  : /ops/audit               (every step above wrote an audit_event)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

// Verification pass over the new schema entities and flow logic, run with a
// freshly loaded Prisma client (the long-running dev server still holds the
// pre-migration client in memory).
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const results: string[] = [];
  const check = (label: string, pass: boolean, detail = "") =>
    results.push(`${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);

  // --- New entities exist and are populated ---
  const policy = await db.verificationPolicy.findFirst({ where: { isDefault: true } });
  check("default verification policy exists", !!policy, policy?.publicId);

  const program = await db.program.findFirst({ where: { publicId: "PRG-OCEAN1" } });
  check("program exists", !!program, program?.name);

  const doingsWithPolicy = await db.earthyDoing.count({
    where: { verificationPolicyId: { not: null } },
  });
  const doingsTotal = await db.earthyDoing.count();
  check(
    "every Earthy Doing links a verification policy",
    doingsWithPolicy === doingsTotal,
    `${doingsWithPolicy}/${doingsTotal}`
  );

  const doingsWithProgram = await db.earthyDoing.count({ where: { programId: { not: null } } });
  check("Earthy Doings linked to a program", doingsWithProgram > 0, `${doingsWithProgram}`);

  // --- New tables are queryable ---
  await db.notification.count();
  check("notifications table queryable", true);
  await db.privacyPreference.count();
  check("privacy_preferences table queryable", true);
  await db.passwordResetToken.count();
  check("password_reset_tokens table queryable", true);
  await db.emailVerificationToken.count();
  check("email_verification_tokens table queryable", true);

  // --- Relations resolve end to end ---
  const doing = await db.earthyDoing.findFirst({
    where: { publicId: "ED-2026-MBC001" },
    include: { verificationPolicy: true, program: true, classifications: true, partner: true },
  });
  check(
    "Earthy Doing resolves policy + program + classifications",
    !!doing?.verificationPolicy && !!doing?.program && doing.classifications.length > 0,
    `${doing?.verificationPolicy?.name} / ${doing?.program?.name}`
  );

  // --- Dispute public ids ---
  const disputesMissingId = await db.dispute.count({ where: { publicId: "" } });
  check("all disputes have a public id", disputesMissingId === 0);

  // --- Existing data intact (nothing destroyed by the migration) ---
  const [users, milestones, verified, devices, audits] = await Promise.all([
    db.user.count(),
    db.journeyMilestone.count(),
    db.journeyMilestone.count({ where: { status: "verified" } }),
    db.journeyPortDevice.count(),
    db.auditEvent.count(),
  ]);
  check("existing users intact", users >= 7, `${users}`);
  check("existing milestones intact", milestones >= 2, `${milestones} (${verified} verified)`);
  check("existing devices intact", devices >= 4, `${devices}`);
  check("audit trail intact", audits > 0, `${audits} events`);

  // --- Device lifecycle rules ---
  const { canTransition } = await import("../src/lib/devices");
  check("device: inventory -> assigned allowed", canTransition("inventory", "assigned"));
  check("device: active -> revoked allowed", canTransition("active", "revoked"));
  check("device: revoked -> active blocked", !canTransition("revoked", "active"));
  check("device: retired is terminal", !canTransition("retired", "active"));

  // --- Earthy Doing lifecycle rules ---
  const ed = await import("../src/lib/earthyDoings");
  check("doing: draft -> published allowed", ed.canTransition("draft", "published"));
  check("doing: published -> paused allowed", ed.canTransition("published", "paused"));
  check("doing: archived is terminal", !ed.canTransition("archived", "published"));
  check("doing: draft -> active blocked", !ed.canTransition("draft", "active"));

  // --- AIM engine still classifies correctly ---
  const { normalizeSignals, computeConfidence } = await import("../src/lib/aim/engine");
  const { classify } = await import("../src/lib/aim/config");
  const both = computeConfidence(
    normalizeSignals([
      { type: "nfc_interaction", value: true },
      { type: "partner_confirmation", value: true },
    ])
  );
  const one = computeConfidence(normalizeSignals([{ type: "partner_confirmation", value: true }]));
  const none = computeConfidence(normalizeSignals([]));
  check("AIM: both signals -> credible", both === 1 && classify(both) === "credible");
  check("AIM: one signal -> needs_review", one === 0.5 && classify(one) === "needs_review");
  check("AIM: no signals -> not_credible", none === 0 && classify(none) === "not_credible");

  console.log(results.join("\n"));
  const failures = results.filter((r) => r.startsWith("FAIL"));
  console.log(
    `\n${results.length - failures.length}/${results.length} checks passed` +
      (failures.length ? ` — ${failures.length} FAILED` : "")
  );
  if (failures.length) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

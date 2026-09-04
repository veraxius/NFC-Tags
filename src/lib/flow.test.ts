import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// A small hand-built in-memory stand-in for the slice of Prisma that
// flow.ts actually calls. Not a general Prisma mock — just enough to drive
// the state machine (TAP → participation → verification → AIM → milestone)
// end to end without touching the real database. Precision over generality:
// each method here only supports the exact call shapes flow.ts uses today.
// ---------------------------------------------------------------------------

type Row = Record<string, any>;

function matchWhere(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (cond && typeof cond === "object" && !Array.isArray(cond) && !(cond instanceof Date)) {
      if ("notIn" in cond) return !cond.notIn.includes(row[key]);
      if ("in" in cond) return cond.in.includes(row[key]);
      // Compound unique key, e.g. earthyDoingId_userId: { earthyDoingId, userId }
      return Object.entries(cond).every(([k, v]) => row[k] === v);
    }
    return row[key] === cond;
  });
}

function makeModel(name: string) {
  const rows: Row[] = [];
  let seq = 0;
  return {
    _rows: rows,
    _seed(row: Row) {
      rows.push(row);
      return row;
    },
    async findUnique({ where }: { where: Row }) {
      return rows.find((r) => matchWhere(r, where)) ?? null;
    },
    async findUniqueOrThrow({ where, include }: { where: Row; include?: Row }) {
      const row = rows.find((r) => matchWhere(r, where));
      if (!row) throw new Error(`${name} not found`);
      return include ? withIncludes(row, include) : row;
    },
    async findFirst({ where, include }: { where: Row; include?: Row }) {
      const row = rows.find((r) => matchWhere(r, where)) ?? null;
      return row && include ? withIncludes(row, include) : row;
    },
    async count({ where }: { where: Row }) {
      return rows.filter((r) => matchWhere(r, where)).length;
    },
    async create({ data }: { data: Row }) {
      const row = { id: data.id ?? `${name}_${++seq}`, ...data };
      rows.push(row);
      return row;
    },
    async update({ where, data }: { where: Row; data: Row }) {
      const row = rows.find((r) => matchWhere(r, where));
      if (!row) throw new Error(`${name} not found for update`);
      Object.assign(row, data);
      return row;
    },
    async updateMany({ where, data }: { where: Row; data: Row }) {
      const matches = rows.filter((r) => matchWhere(r, where));
      matches.forEach((r) => Object.assign(r, data));
      return { count: matches.length };
    },
    async upsert({ where, create, update }: { where: Row; create: Row; update: Row }) {
      const row = rows.find((r) => matchWhere(r, where));
      if (row) {
        Object.assign(row, update);
        return row;
      }
      const newRow = { id: `${name}_${++seq}`, ...create };
      rows.push(newRow);
      return newRow;
    },
  };
}

// Relation wiring is hand-coded per case actually used by flow.ts — not a
// generic Prisma `include` resolver.
function withIncludes(row: Row, include: Row): Row {
  const result = { ...row };
  if (include.verification) {
    result.verification = db.verification._rows.find((v) => v.participationId === row.id) ?? null;
  }
  if (include.participation) {
    result.participation = db.participation._rows.find((p) => p.id === row.participationId) ?? null;
  }
  return result;
}

const db = {
  earthyDoing: makeModel("earthyDoing"),
  participation: makeModel("participation"),
  verification: makeModel("verification"),
  evidence: makeModel("evidence"),
  journeyMilestone: makeModel("journeyMilestone"),
  notification: makeModel("notification"),
  auditEvent: makeModel("auditEvent"),
  user: makeModel("user"),
  partnerUser: makeModel("partnerUser"),
  $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
};

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/aim", () => ({ requestAimAssessment: vi.fn() }));
vi.mock("@/lib/webhooks", () => ({ notifyN8n: vi.fn() }));

const { requestAimAssessment } = await import("@/lib/aim");
const {
  recordParticipation,
  completeParticipation,
  approveVerification,
  rejectVerification,
  cancelParticipation,
  revokeVerification,
  FlowError,
} = await import("@/lib/flow");

function resetDb() {
  for (const model of [db.earthyDoing, db.participation, db.verification, db.evidence, db.journeyMilestone, db.notification, db.auditEvent, db.user, db.partnerUser]) {
    model._rows.length = 0;
  }
}

const DOING_ID = "doing_1";
const USER_ID = "user_1";

beforeEach(() => {
  resetDb();
  vi.clearAllMocks();
  db.earthyDoing._seed({
    id: DOING_ID,
    partnerId: "partner_1",
    status: "published",
    title: "Beach Cleanup",
    capacity: null,
    locationId: null,
  });
  db.user._seed({ id: USER_ID, email: "member@example.com", displayName: "Ana Torres", firstName: "Ana", lastName: "Torres" });
});

describe("recordParticipation", () => {
  it("creates a participation in 'detected' status", async () => {
    const { participation, duplicate } = await recordParticipation({
      userId: USER_ID,
      deviceId: "device_1",
      earthyDoingId: DOING_ID,
    });
    expect(duplicate).toBe(false);
    expect(participation.status).toBe("detected");
    expect(participation.earthyDoingId).toBe(DOING_ID);
  });

  it("returns the existing participation instead of creating a duplicate", async () => {
    const first = await recordParticipation({ userId: USER_ID, deviceId: null, earthyDoingId: DOING_ID });
    const second = await recordParticipation({ userId: USER_ID, deviceId: null, earthyDoingId: DOING_ID });
    expect(second.duplicate).toBe(true);
    expect(second.participation.id).toBe(first.participation.id);
    expect(db.participation._rows).toHaveLength(1);
  });

  it("rejects with EVENT_NOT_ACTIVE for a cancelled Earthy Doing", async () => {
    db.earthyDoing._rows[0].status = "cancelled";
    const err = await recordParticipation({ userId: USER_ID, deviceId: null, earthyDoingId: DOING_ID }).catch((e) => e);
    expect(err).toBeInstanceOf(FlowError);
    expect(err.code).toBe("EVENT_NOT_ACTIVE");
  });

  it("rejects with EVENT_FULL once capacity is reached", async () => {
    db.earthyDoing._rows[0].capacity = 1;
    await recordParticipation({ userId: USER_ID, deviceId: null, earthyDoingId: DOING_ID });
    const err = await recordParticipation({ userId: "user_2", deviceId: null, earthyDoingId: DOING_ID }).catch((e) => e);
    expect(err).toBeInstanceOf(FlowError);
    expect(err.code).toBe("EVENT_FULL");
  });
});

describe("completeParticipation", () => {
  it("moves the participation to verification_pending and opens a pending verification", async () => {
    const { participation } = await recordParticipation({ userId: USER_ID, deviceId: "device_1", earthyDoingId: DOING_ID });
    const verification = await completeParticipation(participation.id, "actor_1", "partner_admin");
    expect(verification.status).toBe("pending");
    const updated = await db.participation.findUnique({ where: { id: participation.id } });
    expect(updated?.status).toBe("verification_pending");
  });

  it("attaches NFC evidence when the tap used a device", async () => {
    const { participation } = await recordParticipation({ userId: USER_ID, deviceId: "device_1", earthyDoingId: DOING_ID });
    await completeParticipation(participation.id, "actor_1", "partner_admin");
    const evidenceTypes = db.evidence._rows.map((e) => e.evidenceType);
    expect(evidenceTypes).toContain("nfc_tap");
    expect(evidenceTypes).toContain("timestamp");
  });

  it("throws INVALID_STATE for a cancelled participation", async () => {
    const { participation } = await recordParticipation({ userId: USER_ID, deviceId: null, earthyDoingId: DOING_ID });
    await db.participation.update({ where: { id: participation.id }, data: { status: "cancelled" } });
    const err = await completeParticipation(participation.id, "actor_1", "partner_admin").catch((e) => e);
    expect(err).toBeInstanceOf(FlowError);
    expect(err.code).toBe("INVALID_STATE");
  });
});

describe("approveVerification", () => {
  async function setupPendingVerification() {
    const { participation } = await recordParticipation({ userId: USER_ID, deviceId: "device_1", earthyDoingId: DOING_ID });
    const verification = await completeParticipation(participation.id, "actor_1", "partner_admin");
    return { participation, verification };
  }

  it("marks the verification verified and the milestone verified when AIM says credible", async () => {
    vi.mocked(requestAimAssessment).mockResolvedValue({ id: "aim_1", assessmentResult: "credible" } as never);
    const { verification } = await setupPendingVerification();

    const result = await approveVerification({ verificationId: verification.id, actorId: "actor_1", actorType: "partner_admin" });

    expect(result.verification.status).toBe("verified");
    expect(result.milestone.status).toBe("verified");
    const updatedParticipation = await db.participation.findUnique({ where: { id: result.verification.participationId } });
    expect(updatedParticipation?.status).toBe("completed");
  });

  it("puts the verification in review (not verified) when AIM says not credible", async () => {
    vi.mocked(requestAimAssessment).mockResolvedValue({ id: "aim_2", assessmentResult: "not_credible" } as never);
    const { verification } = await setupPendingVerification();

    const result = await approveVerification({ verificationId: verification.id, actorId: "actor_1", actorType: "partner_admin" });

    expect(result.verification.status).toBe("review");
    expect(result.milestone.status).toBe("pending");
  });

  it("throws INVALID_STATE if the verification isn't pending or in review", async () => {
    vi.mocked(requestAimAssessment).mockResolvedValue({ id: "aim_3", assessmentResult: "credible" } as never);
    const { verification } = await setupPendingVerification();
    await approveVerification({ verificationId: verification.id, actorId: "actor_1", actorType: "partner_admin" });

    const err = await approveVerification({ verificationId: verification.id, actorId: "actor_1", actorType: "partner_admin" }).catch((e) => e);
    expect(err).toBeInstanceOf(FlowError);
    expect(err.code).toBe("INVALID_STATE");
  });
});

describe("rejectVerification", () => {
  it("rejects the verification and invalidates the participation", async () => {
    const { participation } = await recordParticipation({ userId: USER_ID, deviceId: null, earthyDoingId: DOING_ID });
    const verification = await completeParticipation(participation.id, "actor_1", "partner_admin");

    const result = await rejectVerification({
      verificationId: verification.id,
      actorId: "actor_1",
      actorType: "partner_admin",
      reasonCode: "NOT_ENOUGH_EVIDENCE",
    });

    expect(result.status).toBe("rejected");
    const updatedParticipation = await db.participation.findUnique({ where: { id: participation.id } });
    expect(updatedParticipation?.status).toBe("invalid");
  });
});

describe("cancelParticipation", () => {
  it("cancels a participation that hasn't been completed", async () => {
    const { participation } = await recordParticipation({ userId: USER_ID, deviceId: null, earthyDoingId: DOING_ID });
    const result = await cancelParticipation({ participationId: participation.id, actorId: USER_ID, actorType: "member" });
    expect(result.status).toBe("cancelled");
  });

  it("refuses to cancel a completed (verified) participation", async () => {
    // Once approveVerification marks the participation "completed", the
    // INVALID_STATE guard in cancelParticipation catches it first — the
    // ALREADY_VERIFIED branch below it guards a narrower edge case that
    // this transition doesn't reach.
    vi.mocked(requestAimAssessment).mockResolvedValue({ id: "aim_4", assessmentResult: "credible" } as never);
    const { participation } = await recordParticipation({ userId: USER_ID, deviceId: "device_1", earthyDoingId: DOING_ID });
    const verification = await completeParticipation(participation.id, "actor_1", "partner_admin");
    await approveVerification({ verificationId: verification.id, actorId: "actor_1", actorType: "partner_admin" });

    const err = await cancelParticipation({ participationId: participation.id, actorId: USER_ID, actorType: "member" }).catch((e) => e);
    expect(err).toBeInstanceOf(FlowError);
    expect(err.code).toBe("INVALID_STATE");
  });
});

describe("revokeVerification", () => {
  it("revokes a verified verification and its milestone", async () => {
    vi.mocked(requestAimAssessment).mockResolvedValue({ id: "aim_5", assessmentResult: "credible" } as never);
    const { participation } = await recordParticipation({ userId: USER_ID, deviceId: "device_1", earthyDoingId: DOING_ID });
    const verification = await completeParticipation(participation.id, "actor_1", "partner_admin");
    await approveVerification({ verificationId: verification.id, actorId: "actor_1", actorType: "partner_admin" });

    const result = await revokeVerification({
      verificationId: verification.id,
      actorId: "ops_1",
      actorType: "beaurity_admin",
      reason: "Evidence later found to be fraudulent",
    });

    expect(result.status).toBe("revoked");
    const milestone = db.journeyMilestone._rows.find((m) => m.verificationId === verification.id);
    expect(milestone?.status).toBe("revoked");
  });

  it("refuses to revoke a verification that was never verified", async () => {
    const { participation } = await recordParticipation({ userId: USER_ID, deviceId: null, earthyDoingId: DOING_ID });
    const verification = await completeParticipation(participation.id, "actor_1", "partner_admin");

    const err = await revokeVerification({ verificationId: verification.id, actorId: "ops_1", actorType: "beaurity_admin", reason: "test" }).catch((e) => e);
    expect(err).toBeInstanceOf(FlowError);
    expect(err.code).toBe("INVALID_STATE");
  });
});

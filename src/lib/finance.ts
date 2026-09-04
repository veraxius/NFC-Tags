import { db } from "./db";
import { audit } from "./audit";
import { notifyN8n } from "./webhooks";
import { SessionUser, isPartnerAdmin, actorTypeFor } from "./auth";
import { donationPublicId, expensePublicId } from "./ids";

// Financial transparency for Partner organizations — donations received and
// expenses incurred, classified the way US nonprofit regulation expects
// (IRS Form 990 functional categories), so an org can show a donor or
// auditor exactly where the money went. Manual entry only; no payment
// processor or bank integration.

export class FinanceError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export const FUNCTIONAL_CATEGORIES = [
  "program_services",
  "management_general",
  "fundraising",
] as const;

export const FUNCTIONAL_CATEGORY_LABELS: Record<string, string> = {
  program_services: "Program Services",
  management_general: "Management & General",
  fundraising: "Fundraising",
};

export const DONOR_TYPES = [
  "individual",
  "foundation",
  "corporation",
  "government_grant",
  "other",
] as const;

export const DONOR_TYPE_LABELS: Record<string, string> = {
  individual: "Individual",
  foundation: "Foundation",
  corporation: "Corporation",
  government_grant: "Government Grant",
  other: "Other",
};

export function assertCanManageFinance(partnerId: string, session: SessionUser): void {
  if (!isPartnerAdmin(session, partnerId)) {
    throw new FinanceError(
      "FORBIDDEN",
      "Only a partner administrator (or Beaurity) can record financial entries.",
      403
    );
  }
}

export async function recordDonation(params: {
  session: SessionUser;
  partnerId: string;
  programId?: string | null;
  earthyDoingId?: string | null;
  donorName?: string | null;
  donorType: string;
  amount: number;
  restricted?: boolean;
  restrictionNote?: string | null;
  receivedAt: Date;
  notes?: string | null;
}) {
  assertCanManageFinance(params.partnerId, params.session);
  if (!(params.amount > 0)) {
    throw new FinanceError("INVALID_AMOUNT", "Amount must be greater than zero.");
  }
  if (!DONOR_TYPES.includes(params.donorType as (typeof DONOR_TYPES)[number])) {
    throw new FinanceError("INVALID_DONOR_TYPE", `Unknown donor type '${params.donorType}'.`);
  }

  const donation = await db.donation.create({
    data: {
      publicId: donationPublicId(),
      partnerId: params.partnerId,
      programId: params.programId ?? null,
      earthyDoingId: params.earthyDoingId ?? null,
      donorName: params.donorName ?? null,
      donorType: params.donorType,
      amount: params.amount,
      restricted: params.restricted ?? false,
      restrictionNote: params.restrictionNote ?? null,
      receivedAt: params.receivedAt,
      recordedBy: params.session.id,
      notes: params.notes ?? null,
    },
  });

  await audit({
    actorType: actorTypeFor(params.session, params.partnerId),
    actorId: params.session.id,
    action: "donation.recorded",
    objectType: "donation",
    objectId: donation.id,
    newState: { amount: params.amount, donorType: params.donorType, restricted: donation.restricted },
  });

  const partner = await db.partner.findUnique({ where: { id: params.partnerId } });
  await notifyN8n("donation.recorded", {
    publicId: donation.publicId,
    partnerName: partner?.name ?? null,
    donorName: donation.donorName ?? "Anonymous",
    donorType: donation.donorType,
    amount: params.amount,
    receivedAt: donation.receivedAt.toISOString(),
    restricted: donation.restricted,
  });

  return donation;
}

export async function recordExpense(params: {
  session: SessionUser;
  partnerId: string;
  programId?: string | null;
  earthyDoingId?: string | null;
  functionalCategory: string;
  subCategory?: string | null;
  vendor?: string | null;
  description: string;
  amount: number;
  spentAt: Date;
}) {
  assertCanManageFinance(params.partnerId, params.session);
  if (!(params.amount > 0)) {
    throw new FinanceError("INVALID_AMOUNT", "Amount must be greater than zero.");
  }
  if (!FUNCTIONAL_CATEGORIES.includes(params.functionalCategory as (typeof FUNCTIONAL_CATEGORIES)[number])) {
    throw new FinanceError(
      "INVALID_CATEGORY",
      `Unknown functional category '${params.functionalCategory}'.`
    );
  }

  const expense = await db.expense.create({
    data: {
      publicId: expensePublicId(),
      partnerId: params.partnerId,
      programId: params.programId ?? null,
      earthyDoingId: params.earthyDoingId ?? null,
      functionalCategory: params.functionalCategory,
      subCategory: params.subCategory ?? null,
      vendor: params.vendor ?? null,
      description: params.description,
      amount: params.amount,
      spentAt: params.spentAt,
      recordedBy: params.session.id,
    },
  });

  await audit({
    actorType: actorTypeFor(params.session, params.partnerId),
    actorId: params.session.id,
    action: "expense.recorded",
    objectType: "expense",
    objectId: expense.id,
    newState: { amount: params.amount, functionalCategory: params.functionalCategory },
  });

  return expense;
}

export type MovementRow = {
  id: string;
  date: Date;
  type: "donation" | "expense";
  label: string;
  detail: string;
  amount: number;
  recordedBy: string;
};

// Shared by the Finance page and its CSV export, so both always agree on
// exactly what "the movements for this period" means.
export async function getFinanceMovements(partnerId: string, since: Date | null): Promise<MovementRow[]> {
  const dateWhereDonation = since ? { gte: since } : undefined;
  const dateWhereExpense = since ? { gte: since } : undefined;

  const [donations, expenses] = await Promise.all([
    db.donation.findMany({
      where: { partnerId, ...(dateWhereDonation ? { receivedAt: dateWhereDonation } : {}) },
      orderBy: { receivedAt: "desc" },
      include: { recorder: true },
    }),
    db.expense.findMany({
      where: { partnerId, ...(dateWhereExpense ? { spentAt: dateWhereExpense } : {}) },
      orderBy: { spentAt: "desc" },
      include: { recorder: true },
    }),
  ]);

  const movements: MovementRow[] = [
    ...donations.map((d) => ({
      id: d.id,
      date: d.receivedAt,
      type: "donation" as const,
      label: d.donorName ?? "Anonymous donor",
      detail: DONOR_TYPE_LABELS[d.donorType] ?? d.donorType,
      amount: Number(d.amount),
      recordedBy: d.recorder.displayName ?? d.recorder.firstName,
    })),
    ...expenses.map((e) => ({
      id: e.id,
      date: e.spentAt,
      type: "expense" as const,
      label: e.description,
      detail: FUNCTIONAL_CATEGORY_LABELS[e.functionalCategory] ?? e.functionalCategory,
      amount: -Number(e.amount),
      recordedBy: e.recorder.displayName ?? e.recorder.firstName,
    })),
  ];

  return movements.sort((a, b) => b.date.getTime() - a.date.getTime());
}

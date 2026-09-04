import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";

// Automation #6 — monthly finance digest, called by n8n on a schedule
// (not by a signed-in user), so auth is a shared secret header instead of
// a session. Returns one row per partner org with that org's admin email
// already resolved, so n8n can send the digest straight through without a
// second lookup.
export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  const token = req.headers.get("x-reports-token");
  if (!token || token !== process.env.REPORTS_API_TOKEN) {
    return fail("UNAUTHENTICATED", "Missing or invalid reports token.", 401);
  }

  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month"); // optional "YYYY-MM", defaults to last full month
  const now = new Date();
  const targetMonth = monthParam
    ? new Date(`${monthParam}-01T00:00:00.000Z`)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const rangeStart = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth(), 1));
  const rangeEnd = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 1));

  const partners = await db.partner.findMany({
    where: { status: { in: ["approved", "active"] } },
    include: {
      partnerUsers: { where: { role: "administrator" }, include: { user: true }, take: 1 },
    },
  });

  const rows = await Promise.all(
    partners.map(async (partner) => {
      const [donations, expenses] = await Promise.all([
        db.donation.aggregate({
          where: { partnerId: partner.id, receivedAt: { gte: rangeStart, lt: rangeEnd } },
          _sum: { amount: true },
          _count: true,
        }),
        db.expense.aggregate({
          where: { partnerId: partner.id, spentAt: { gte: rangeStart, lt: rangeEnd } },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

      const totalDonations = Number(donations._sum.amount ?? 0);
      const totalExpenses = Number(expenses._sum.amount ?? 0);
      const admin = partner.partnerUsers[0]?.user;

      return {
        partnerId: partner.publicId,
        partnerName: partner.name,
        adminEmail: admin?.email ?? null,
        adminName: admin?.displayName ?? null,
        donationsReceived: totalDonations,
        donationsCount: donations._count,
        expensesSpent: totalExpenses,
        expensesCount: expenses._count,
        netBalance: totalDonations - totalExpenses,
        month: rangeStart.toISOString().slice(0, 7),
      };
    })
  );

  return ok({
    month: rangeStart.toISOString().slice(0, 7),
    partners: rows.filter((r) => r.adminEmail), // skip orgs with no admin to notify
  });
});

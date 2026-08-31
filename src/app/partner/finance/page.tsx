import { requireUser, isPartnerAdmin } from "@/lib/auth";
import { resolvePartnerFor } from "@/lib/partner";
import { db } from "@/lib/db";
import { Kpi, Card, Table } from "@/components/ui";
import {
  FUNCTIONAL_CATEGORIES,
  FUNCTIONAL_CATEGORY_LABELS,
  DONOR_TYPES,
  DONOR_TYPE_LABELS,
} from "@/lib/finance";
import { recordDonationAction, recordExpenseAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

// Financial transparency for the organization — donations received, spending
// classified by the IRS Form 990 functional categories (Program Services /
// Management & General / Fundraising), and a combined movement ledger. Every
// entry can optionally be tied to a Program or Earthy Doing, so money can be
// traced to the verified impact it funded. Manual entry only.

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const CATEGORY_BAR_COLOR: Record<string, string> = {
  program_services: "var(--color-mint)",
  management_general: "var(--color-gold)",
  fundraising: "var(--color-peach)",
};

function ratioColor(pct: number) {
  if (pct >= 65) return "text-[var(--color-mint-ink)]";
  if (pct >= 50) return "text-[var(--color-gold-ink)]";
  return "text-[var(--color-plum)]";
}

export default async function PartnerFinance({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await requireUser();
  const partner = await resolvePartnerFor(user);
  const canManage = isPartnerAdmin(user, partner.id);

  const { period = "30" } = await searchParams;
  const since = period === "all" ? null : new Date(Date.now() - (Number(period) || 30) * 864e5);
  const dateWhere = since ? { gte: since } : undefined;

  const [donations, expenses, programs, doings] = await Promise.all([
    db.donation.findMany({
      where: { partnerId: partner.id, ...(dateWhere ? { receivedAt: dateWhere } : {}) },
      include: { program: true, earthyDoing: true, recorder: true },
      orderBy: { receivedAt: "desc" },
    }),
    db.expense.findMany({
      where: { partnerId: partner.id, ...(dateWhere ? { spentAt: dateWhere } : {}) },
      include: { program: true, earthyDoing: true, recorder: true },
      orderBy: { spentAt: "desc" },
    }),
    db.program.findMany({ where: { partnerId: partner.id }, orderBy: { name: "asc" } }),
    db.earthyDoing.findMany({ where: { partnerId: partner.id }, orderBy: { title: "asc" }, take: 100 }),
  ]);

  const totalDonations = donations.reduce((s, d) => s + Number(d.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const netBalance = totalDonations - totalExpenses;
  const restrictedOutstanding = donations
    .filter((d) => d.restricted)
    .reduce((s, d) => s + Number(d.amount), 0);

  const byCategory = FUNCTIONAL_CATEGORIES.map((cat) => {
    const amount = expenses.filter((e) => e.functionalCategory === cat).reduce((s, e) => s + Number(e.amount), 0);
    return { category: cat, amount, pct: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0 };
  });
  const programServicesPct = byCategory.find((c) => c.category === "program_services")?.pct ?? 0;

  // Group both donations and expenses by "what it funded" — a Program, an
  // Earthy Doing, or unassigned/general — so a reader can see cost vs.
  // funding per activity, not just per category.
  type GroupRow = { label: string; donations: number; expenses: number };
  const groups = new Map<string, GroupRow>();
  const bump = (label: string, field: "donations" | "expenses", amount: number) => {
    const row = groups.get(label) ?? { label, donations: 0, expenses: 0 };
    row[field] += amount;
    groups.set(label, row);
  };
  for (const d of donations) {
    bump(d.program?.name ?? d.earthyDoing?.title ?? "General / unassigned", "donations", Number(d.amount));
  }
  for (const e of expenses) {
    bump(e.program?.name ?? e.earthyDoing?.title ?? "General / unassigned", "expenses", Number(e.amount));
  }
  const byProgram = [...groups.values()].sort((a, b) => (b.donations + b.expenses) - (a.donations + a.expenses));

  const movements = [
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
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const inputClass =
    "w-full rounded-2xl border border-[var(--color-warmgray)] px-3 py-2 text-sm focus:border-[var(--color-pink)] focus:outline-none";
  const labelClass = "mb-1 block text-xs font-medium text-[var(--color-text-secondary)]";
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Finance</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Donations, spending, and movements for {partner.name}.
          </p>
        </div>
        <form method="get">
          <select
            name="period"
            defaultValue={period}
            className="rounded-[10px] border border-black/10 bg-white/70 px-3 py-1.5 text-[13px]"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last 12 months</option>
            <option value="all">All time</option>
          </select>
          <button className="btn-primary ml-2 !px-4 !py-1.5 !text-[13px]">Apply</button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Kpi label="Donations received" value={USD.format(totalDonations)} accent />
        <Kpi label="Total spending" value={USD.format(totalExpenses)} />
        <Kpi label="Net balance" value={USD.format(netBalance)} />
        <Kpi label="Restricted funds" value={USD.format(restrictedOutstanding)} />
        <div className="glass p-4">
          <div className={`text-2xl font-semibold tracking-tight ${ratioColor(programServicesPct)}`}>
            {programServicesPct.toFixed(0)}%
          </div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
            Program services ratio
          </div>
        </div>
      </div>

      <Card title="Spending by category (IRS Form 990 functional classification)">
        <div className="space-y-4">
          {byCategory.map((c) => (
            <div key={c.category}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-[var(--color-text)]">
                  {FUNCTIONAL_CATEGORY_LABELS[c.category]}
                </span>
                <span className="text-[var(--color-text-secondary)]">
                  {USD.format(c.amount)} · {c.pct.toFixed(0)}%
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-alt)]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(c.pct, c.amount > 0 ? 2 : 0)}%`, background: CATEGORY_BAR_COLOR[c.category] }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-[var(--color-text-secondary)]">
          A Program Services ratio of 65% or higher is generally considered healthy by charity
          watchdogs; below 50% typically draws scrutiny.
        </p>
      </Card>

      <Card title="By program">
        <Table headers={["Program / Earthy Doing", "Donations", "Spending", "Net"]}>
          {byProgram.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-4 text-sm text-[var(--color-text-secondary)]">
                Nothing recorded for this period.
              </td>
            </tr>
          ) : (
            byProgram.map((row) => (
              <tr key={row.label}>
                <td className="px-4 py-2.5 font-medium">{row.label}</td>
                <td className="px-4 py-2.5 text-[var(--color-mint-ink)]">{USD.format(row.donations)}</td>
                <td className="px-4 py-2.5 text-[var(--color-plum)]">{USD.format(row.expenses)}</td>
                <td className="px-4 py-2.5">{USD.format(row.donations - row.expenses)}</td>
              </tr>
            ))
          )}
        </Table>
      </Card>

      <Card title="Movements">
        <Table headers={["Date", "Type", "Description", "Detail", "Amount", "Recorded by"]}>
          {movements.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-4 text-sm text-[var(--color-text-secondary)]">
                No movements in this period.
              </td>
            </tr>
          ) : (
            movements.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                  {m.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      m.type === "donation"
                        ? "bg-[var(--color-mint-soft)] text-[var(--color-mint-ink)]"
                        : "bg-[var(--color-plum-soft)] text-[var(--color-plum)]"
                    }`}
                  >
                    {m.type === "donation" ? "Donation" : "Expense"}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-medium">{m.label}</td>
                <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{m.detail}</td>
                <td
                  className={`px-4 py-2.5 font-semibold ${
                    m.amount >= 0 ? "text-[var(--color-mint-ink)]" : "text-[var(--color-plum)]"
                  }`}
                >
                  {m.amount >= 0 ? "+" : "−"}
                  {USD.format(Math.abs(m.amount))}
                </td>
                <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{m.recordedBy}</td>
              </tr>
            ))
          )}
        </Table>
      </Card>

      {canManage && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card title="+ Record donation">
            <form action={recordDonationAction} className="space-y-3">
              <input type="hidden" name="partnerId" value={partner.id} />
              <div>
                <label className={labelClass}>Amount (USD)</label>
                <input name="amount" type="number" step="0.01" min="0.01" required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Donor name (leave blank for anonymous)</label>
                <input name="donorName" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Donor type</label>
                <select name="donorType" className={inputClass} defaultValue="individual">
                  {DONOR_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {DONOR_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Received on</label>
                <input name="receivedAt" type="date" required defaultValue={today} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Program (optional)</label>
                <select name="programId" className={inputClass} defaultValue="">
                  <option value="">— none —</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Earthy Doing (optional)</label>
                <select name="earthyDoingId" className={inputClass} defaultValue="">
                  <option value="">— none —</option>
                  {doings.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <input type="checkbox" name="restricted" className="accent-[var(--color-pink)]" />
                Donor restricted this gift to a specific purpose
              </label>
              <div>
                <label className={labelClass}>Restriction note (if restricted)</label>
                <input name="restrictionNote" className={inputClass} />
              </div>
              <button className="w-full rounded-full bg-[var(--color-pink)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-pink-hover)]">
                Record donation
              </button>
            </form>
          </Card>

          <Card title="+ Record expense">
            <form action={recordExpenseAction} className="space-y-3">
              <input type="hidden" name="partnerId" value={partner.id} />
              <div>
                <label className={labelClass}>What was it for?</label>
                <input name="description" required placeholder="e.g. Cleanup supplies" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Amount (USD)</label>
                <input name="amount" type="number" step="0.01" min="0.01" required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Functional category (IRS Form 990)</label>
                <select name="functionalCategory" className={inputClass} defaultValue="program_services">
                  {FUNCTIONAL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {FUNCTIONAL_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Sub-category (optional, internal)</label>
                <input name="subCategory" placeholder="e.g. Materials, Transport" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Vendor (optional)</label>
                <input name="vendor" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Spent on</label>
                <input name="spentAt" type="date" required defaultValue={today} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Program (optional)</label>
                <select name="programId" className={inputClass} defaultValue="">
                  <option value="">— none —</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Earthy Doing (optional)</label>
                <select name="earthyDoingId" className={inputClass} defaultValue="">
                  <option value="">— none —</option>
                  {doings.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>
              <button className="w-full rounded-full bg-[var(--color-pink)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-pink-hover)]">
                Record expense
              </button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

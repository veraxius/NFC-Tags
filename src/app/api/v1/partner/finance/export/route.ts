import { NextResponse } from "next/server";
import { requireUser, canActForPartner, AuthError } from "@/lib/auth";
import { getFinanceMovements } from "@/lib/finance";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Not wrapped in the usual ok()/fail() JSON envelope — this returns a real
// CSV file for the browser to download, triggered by a plain <a href>, not
// a fetch() call.
export async function GET(req: Request) {
  let session;
  try {
    session = await requireUser();
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }

  const { searchParams } = new URL(req.url);
  const partnerId = searchParams.get("partnerId");
  const period = searchParams.get("period") ?? "30";
  if (!partnerId) return NextResponse.json({ error: "Missing partnerId" }, { status: 400 });
  if (!canActForPartner(session, partnerId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const since = period === "all" ? null : new Date(Date.now() - (Number(period) || 30) * 864e5);
  const movements = await getFinanceMovements(partnerId, since);

  const csv = toCsv(
    ["Date", "Type", "Description", "Detail", "Amount (USD)", "Recorded by"],
    movements.map((m) => [
      m.date.toISOString().slice(0, 10),
      m.type,
      m.label,
      m.detail,
      m.amount.toFixed(2),
      m.recordedBy,
    ])
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="finance-${period}.csv"`,
    },
  });
}

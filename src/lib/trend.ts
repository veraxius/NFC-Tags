// Buckets a list of dates into the last N calendar months (in JS, not SQL —
// datasets here are small enough that a raw-SQL date_trunc isn't worth the
// portability risk). Used for the small trend/sparkline charts.
export function monthBuckets(dates: Date[], months = 6): { label: string; value: number }[] {
  const now = new Date();
  const buckets: { label: string; value: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("en-US", { month: "short" });
    const value = dates.filter(
      (x) => x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth()
    ).length;
    buckets.push({ label, value });
  }
  return buckets;
}

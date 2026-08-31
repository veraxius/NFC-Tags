// % change vs. a prior comparison value, for period-over-period KPI deltas.
// Returns null when there's nothing meaningful to compare (previous period
// was zero and current is also zero — a real 0 -> N jump still reports,
// since that's a genuine "new this period" signal worth showing).
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? null : 100;
  return ((current - previous) / previous) * 100;
}

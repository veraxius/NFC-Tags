// Minimal RFC 4180 CSV writer — no dependency needed for something this
// small. Quotes a field only when it actually needs it (contains a comma,
// quote, or newline), which is what keeps the output readable in a plain
// text editor as well as Excel/Sheets.
function escapeCsvField(value: string | number | boolean | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(","));
  return lines.join("\r\n") + "\r\n";
}

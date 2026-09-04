"use client";

// "Export to PDF" without a PDF library: the browser's own print dialog
// already offers "Save as PDF" everywhere that matters, and print.css below
// hides everything but the report itself when it's used that way.
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-[var(--color-text)] transition-colors hover:bg-black/[0.04]"
    >
      Print / Save as PDF
    </button>
  );
}

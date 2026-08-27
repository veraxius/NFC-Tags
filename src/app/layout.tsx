import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beaurity JourneyPort™ — Earthy Doings™",
  description:
    "Record. Verify. Grow. Every meaningful action becomes part of your trusted Journey.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}

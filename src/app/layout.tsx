import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beaurity JourneyPort™ — Earthy Doings™",
  description:
    "Record. Verify. Grow. Every meaningful action becomes part of your trusted Journey.",
  icons: {
    icon: "/beaurity-imagen.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased" style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>
        {children}
      </body>
    </html>
  );
}

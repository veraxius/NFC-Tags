import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Wordmark face for the "Beaurity" brand mark specifically (navbar, landing
// header/footer) — a clean geometric sans with more character than the
// system UI font, chosen for legibility at small sizes on phone screens
// (the brand's own script logotype was dropped for exactly that reason).
const wordmark = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-wordmark",
  display: "swap",
});

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
    <html lang="en" className={wordmark.variable}>
      <body className="min-h-screen antialiased" style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>
        {children}
      </body>
    </html>
  );
}

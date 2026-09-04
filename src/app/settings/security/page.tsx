import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser, isAdminAnywhere } from "@/lib/auth";
import { Headline } from "@/components/organic";
import { TwoFactorSettings } from "./TwoFactorSettings";

export const dynamic = "force-dynamic";

// Cross-cutting account security — not owned by Ops, Partner, or Journey,
// so it lives outside those three sidebars rather than duplicated in each.
export default async function SecuritySettingsPage() {
  const session = await requireUser();
  if (!isAdminAnywhere(session)) redirect("/");

  const user = await db.user.findUniqueOrThrow({ where: { id: session.id } });

  return (
    <main className="mx-auto min-h-screen max-w-lg px-6 py-12">
      <Link href="/" className="text-[13px] font-medium text-[var(--color-pink)] hover:underline">
        ‹ JourneyPort™
      </Link>
      <Headline className="mt-3 text-2xl">Account security</Headline>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Optional two-factor authentication for admin accounts — yours, {session.displayName}.
      </p>
      <div className="mt-8">
        <TwoFactorSettings initiallyEnabled={user.twoFactorEnabled} />
      </div>
    </main>
  );
}

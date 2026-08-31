import { redirect } from "next/navigation";
import { getSessionUser, isBeaurityAdmin } from "@/lib/auth";
import { NavBar } from "@/components/ui";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/partner");
  if (user.partnerRoles.length === 0 && !isBeaurityAdmin(user)) redirect("/journey");
  return (
    <>
      <NavBar
        title="Partner Dashboard"
        user={user}
        links={[
          { href: "/partner", label: "Overview" },
          { href: "/partner/doings", label: "Earthy Doings" },
          { href: "/partner/verifications", label: "Confirmations" },
          { href: "/partner/finance", label: "Finance" },
        ]}
      />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}

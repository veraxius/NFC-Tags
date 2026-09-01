import { redirect } from "next/navigation";
import { getSessionUser, isBeaurityAdmin } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { IconHome, IconLeaf, IconCheck, IconUsers, IconDollar } from "@/components/icons";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/partner");
  if (user.partnerRoles.length === 0 && !isBeaurityAdmin(user)) redirect("/journey");
  return (
    <div className="flex min-h-screen" data-app-shell>
      <Sidebar
        title="Partner Dashboard"
        homeHref="/partner"
        links={[
          { href: "/partner", label: "Overview", icon: <IconHome /> },
          { href: "/partner/doings", label: "Earthy Doings", icon: <IconLeaf /> },
          { href: "/partner/verifications", label: "Confirmations", icon: <IconCheck /> },
          { href: "/partner/people", label: "People", icon: <IconUsers /> },
          { href: "/partner/finance", label: "Finance", icon: <IconDollar /> },
        ]}
      />
      <main className="mx-auto min-w-0 w-full max-w-6xl flex-1 px-4 py-8 pb-24 sm:pb-8">{children}</main>
    </div>
  );
}

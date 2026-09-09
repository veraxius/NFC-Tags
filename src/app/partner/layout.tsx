import { redirect } from "next/navigation";
import { getSessionUser, isBeaurityAdmin, isAdminAnywhere } from "@/lib/auth";
import { countUnreadMessages } from "@/lib/messages";
import { Sidebar } from "@/components/Sidebar";
import { IconHome, IconLeaf, IconCheck, IconUsers, IconDollar, IconLock, IconBuilding, IconFlag, IconGlobe, IconMail, IconUserCircle } from "@/components/icons";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/partner");
  if (user.partnerRoles.length === 0 && !isBeaurityAdmin(user)) redirect("/journey");
  const unread = await countUnreadMessages(user.id);
  const links = [
    { href: "/partner", label: "Overview", icon: <IconHome /> },
    { href: "/partner/goals", label: "Goals", icon: <IconFlag /> },
    { href: "/partner/doings", label: "Earthy Doings", icon: <IconLeaf /> },
    { href: "/partner/explore", label: "Explore", icon: <IconGlobe /> },
    { href: "/messages", label: "Messages", icon: <IconMail />, badge: unread },
    { href: "/partner/verifications", label: "Confirmations", icon: <IconCheck /> },
    { href: "/partner/people", label: "People", icon: <IconUsers /> },
    { href: "/partner/finance", label: "Finance", icon: <IconDollar /> },
  ];
  if (isAdminAnywhere(user)) {
    links.push({ href: "/partner/team", label: "Team", icon: <IconBuilding /> });
    links.push({ href: "/settings/security", label: "Security", icon: <IconLock /> });
  }
  links.push({ href: "/profile/me", label: "Profile", icon: <IconUserCircle /> });
  return (
    <div className="flex min-h-screen" data-app-shell>
      <Sidebar title="Partner Dashboard" homeHref="/partner" links={links} />
      <main className="mx-auto min-w-0 w-full max-w-6xl flex-1 px-4 py-8 pb-24 sm:pb-8">{children}</main>
    </div>
  );
}

import { redirect } from "next/navigation";
import { getSessionUser, isBeaurityAdmin } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import {
  IconHome,
  IconUsers,
  IconBuilding,
  IconLeaf,
  IconCheck,
  IconCard,
  IconShield,
  IconGlobe,
  IconFlag,
  IconChart,
  IconClock,
  IconSettings,
} from "@/components/icons";

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/ops");
  if (!isBeaurityAdmin(user)) redirect("/");
  return (
    <div className="flex min-h-screen">
      <Sidebar
        title="Beaurity Operations"
        homeHref="/ops"
        links={[
          { href: "/ops", label: "Overview", icon: <IconHome /> },
          { href: "/ops/members", label: "Members", icon: <IconUsers /> },
          { href: "/ops/partners", label: "Partners", icon: <IconBuilding /> },
          { href: "/ops/doings", label: "Earthy Doings", icon: <IconLeaf /> },
          { href: "/ops/verifications", label: "Verifications", icon: <IconCheck /> },
          { href: "/ops/devices", label: "JourneyPorts", icon: <IconCard /> },
          { href: "/ops/aim", label: "AIM Trust", icon: <IconShield /> },
          { href: "/ops/impact", label: "Impact", icon: <IconGlobe /> },
          { href: "/ops/disputes", label: "Disputes", icon: <IconFlag /> },
          { href: "/ops/reports", label: "Reports", icon: <IconChart /> },
          { href: "/ops/audit", label: "Audit", icon: <IconClock /> },
          { href: "/ops/system", label: "System", icon: <IconSettings /> },
        ]}
      />
      <main className="mx-auto min-w-0 w-full max-w-6xl flex-1 px-4 py-8 pb-24 sm:pb-8">{children}</main>
    </div>
  );
}

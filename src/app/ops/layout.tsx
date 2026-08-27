import { redirect } from "next/navigation";
import { getSessionUser, isBeaurityAdmin } from "@/lib/auth";
import { NavBar } from "@/components/ui";

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/ops");
  if (!isBeaurityAdmin(user)) redirect("/");
  return (
    <>
      <NavBar
        title="Beaurity Operations"
        user={user}
        links={[
          { href: "/ops", label: "Overview" },
          { href: "/ops/members", label: "Members" },
          { href: "/ops/partners", label: "Partners" },
          { href: "/ops/doings", label: "Earthy Doings" },
          { href: "/ops/verifications", label: "Verifications" },
          { href: "/ops/devices", label: "JourneyPorts" },
          { href: "/ops/aim", label: "AIM Trust" },
          { href: "/ops/impact", label: "Impact" },
          { href: "/ops/disputes", label: "Disputes" },
          { href: "/ops/audit", label: "Audit" },
        ]}
      />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}

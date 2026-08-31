import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { IconHome, IconCard, IconLock } from "@/components/icons";

export default async function JourneyLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/journey");
  return (
    <div className="flex min-h-screen">
      <Sidebar
        title="My Journey"
        homeHref="/journey"
        links={[
          { href: "/journey", label: "Timeline", icon: <IconHome /> },
          { href: "/journey/devices", label: "My JourneyPorts", icon: <IconCard /> },
          { href: "/journey/privacy", label: "Privacy", icon: <IconLock /> },
        ]}
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 pb-24 sm:pb-8">{children}</main>
    </div>
  );
}

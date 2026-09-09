import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { countUnreadMessages } from "@/lib/messages";
import { Sidebar } from "@/components/Sidebar";
import { IconHome, IconCard, IconLock, IconGlobe, IconMail, IconUserCircle } from "@/components/icons";

export default async function JourneyLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/journey");
  const unread = await countUnreadMessages(user.id);
  return (
    <div className="flex min-h-screen" data-app-shell>
      <Sidebar
        title="My Journey"
        homeHref="/journey"
        links={[
          { href: "/journey", label: "Timeline", icon: <IconHome /> },
          { href: "/journey/explore", label: "Explore", icon: <IconGlobe /> },
          { href: "/messages", label: "Messages", icon: <IconMail />, badge: unread },
          { href: "/journey/devices", label: "My JourneyPorts", icon: <IconCard /> },
          { href: "/journey/privacy", label: "Privacy", icon: <IconLock /> },
          { href: "/profile/me", label: "Profile", icon: <IconUserCircle /> },
        ]}
      />
      <main className="mx-auto min-w-0 w-full max-w-3xl flex-1 px-4 py-8 pb-24 sm:pb-8">{children}</main>
    </div>
  );
}

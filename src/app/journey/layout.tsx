import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { NavBar } from "@/components/ui";

export default async function JourneyLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/journey");
  return (
    <>
      <NavBar
        title="My Journey"
        user={user}
        links={[
          { href: "/journey", label: "Timeline" },
          { href: "/journey/devices", label: "My JourneyPorts" },
          { href: "/journey/privacy", label: "Privacy & Consent" },
        ]}
      />
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </>
  );
}

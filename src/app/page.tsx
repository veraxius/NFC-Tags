import { redirect } from "next/navigation";
import { getSessionUser, isBeaurityAdmin } from "@/lib/auth";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { Hero } from "@/components/landing/Hero";
import { WhatIsEarthyDoing } from "@/components/landing/WhatIsEarthyDoing";
import { InAction } from "@/components/landing/InAction";
import { TripleImpact } from "@/components/landing/TripleImpact";
import { MeetJourneyPort } from "@/components/landing/MeetJourneyPort";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { YourJourney } from "@/components/landing/YourJourney";
import { ForOrganizations } from "@/components/landing/ForOrganizations";
import { TrustPrivacy } from "@/components/landing/TrustPrivacy";
import { StartCta } from "@/components/landing/StartCta";
import { SiteFooter } from "@/components/landing/SiteFooter";

// Homepage — content framework "Beaurity EarthyDoing™ Website V2".
// The visitor's journey: WHY → WHAT → EXPERIENCE → VALUE → TECHNOLOGY →
// TRUST → ACTION, mapped across the ten sections below.
export default async function Home() {
  const user = await getSessionUser();
  if (user) {
    if (isBeaurityAdmin(user)) redirect("/ops");
    if (user.partnerRoles.length > 0) redirect("/partner");
    redirect("/journey");
  }

  return (
    <main>
      <SiteHeader />
      <Hero /> {/* 01 — WHY it matters */}
      <WhatIsEarthyDoing /> {/* 02 — WHAT it is */}
      <InAction /> {/* 03 — WHAT, made concrete */}
      <TripleImpact /> {/* 04 — WHAT, the framework */}
      <MeetJourneyPort /> {/* 05 — EXPERIENCE, the object */}
      <HowItWorks /> {/* 06 — EXPERIENCE, the mechanism */}
      <YourJourney /> {/* 07 — VALUE, for individuals */}
      <ForOrganizations /> {/* 08 — VALUE, for institutions */}
      <TrustPrivacy /> {/* 09 — TECHNOLOGY + TRUST */}
      <StartCta /> {/* 10 — ACTION */}
      <SiteFooter />
    </main>
  );
}

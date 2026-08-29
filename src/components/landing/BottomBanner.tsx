import Image from "next/image";
import { Reveal } from "@/components/Reveal";

// Closing banner — the client's finished graphic, placed as the last
// visual note before the footer (per explicit placement: "Bottom Image",
// not tied to a specific section headline). Contained with rounded
// corners, matching the hero and every other image on the page.
export function BottomBanner() {
  return (
    <Reveal>
      <div className="mx-auto max-w-none px-1 pb-8 sm:px-2">
        <Image
          src="/website-bottom-banner.png"
          alt="Beaurity EarthyDoing — verified, not assumed. Real actions, real impact. Your data, your control. Built for trust, designed for impact."
          width={1536}
          height={1024}
          sizes="100vw"
          className="h-auto w-full rounded-[28px]"
        />
      </div>
    </Reveal>
  );
}

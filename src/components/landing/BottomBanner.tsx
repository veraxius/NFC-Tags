import Image from "next/image";
import { Reveal } from "@/components/Reveal";

// Closing full-bleed banner — the client's finished graphic, placed edge to
// edge as the last visual note before the footer (per explicit placement:
// "Bottom Image", not tied to a specific section headline).
export function BottomBanner() {
  return (
    <Reveal>
      <div className="relative w-full">
        <Image
          src="/website-bottom-banner.png"
          alt="Beaurity EarthyDoing — verified, not assumed. Real actions, real impact. Your data, your control. Built for trust, designed for impact."
          width={1536}
          height={1024}
          sizes="100vw"
          className="h-auto w-full"
        />
      </div>
    </Reveal>
  );
}

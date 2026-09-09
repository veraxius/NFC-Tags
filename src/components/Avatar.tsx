"use client";

import { useEffect, useState } from "react";
import { IconClose } from "@/components/icons";

// eslint-disable-next-line @next/next/no-img-element -- avatarUrl is a
// data: URL (inline base64), which next/image can't optimize anyway.
export function Avatar({
  src,
  name,
  size = 40,
  position,
}: {
  src?: string | null;
  name: string;
  size?: number;
  // CSS object-position for the circle crop only (e.g. "50% 30%") — the
  // full photo in the lightbox always shows uncropped, regardless of this.
  position?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const initial = (name.trim()[0] ?? "?").toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (src) {
    // A <span role="button"> rather than a real <button> — Avatar often
    // sits inside a Link (the message list, "Who's here"), and a <button>
    // nested in an <a> is invalid HTML. stopPropagation keeps the click
    // from also triggering that ancestor Link's navigation.
    const openLightbox = (e: { stopPropagation: () => void; preventDefault: () => void }) => {
      e.stopPropagation();
      e.preventDefault();
      setOpen(true);
    };

    return (
      <>
        <span
          role="button"
          tabIndex={0}
          onClick={openLightbox}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openLightbox(e)}
          aria-label={`View ${name}'s photo`}
          className="inline-flex shrink-0 cursor-pointer rounded-full"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={name}
            width={size}
            height={size}
            className="rounded-full object-cover"
            style={{ width: size, height: size, objectPosition: position ?? "50% 50%" }}
          />
        </span>

        {open && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-6"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              aria-label="Close"
              className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[var(--color-text)] shadow-lg hover:bg-white"
            >
              <IconClose className="h-5 w-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={name}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            />
          </div>
        )}
      </>
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-[var(--color-pink-soft)] font-semibold text-[var(--color-pink-ink)]"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

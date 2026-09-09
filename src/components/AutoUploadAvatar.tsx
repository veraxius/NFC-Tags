"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconCamera } from "@/components/icons";
import { updateAvatarAction } from "@/lib/actions";

const FRAME = 140;

// Pick a photo, then drag it around inside the circle to choose what shows
// — the crop position, not the file, is what needs a deliberate confirm
// step here (picking the file alone doesn't tell us how to frame it).
// The full photo is never actually cropped; only object-position is saved,
// so anyone who opens the lightbox later still sees the whole picture.
//
// The upload itself is driven from here (not a plain <form action=...>) so
// a rejected file (too large, wrong type) surfaces an actual message
// instead of leaving the button stuck on "Uploading…" forever with no way
// to tell what happened.
export function AutoUploadAvatar() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [error, setError] = useState<string | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setError(null);
    setPreviewUrl(URL.createObjectURL(file));
    setPos({ x: 50, y: 50 });
  }

  function cancel() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, posX: pos.x, posY: pos.y };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const { startX, startY, posX, posY } = dragRef.current;
    const dx = ((e.clientX - startX) / FRAME) * 100;
    const dy = ((e.clientY - startY) / FRAME) * 100;
    // Dragging the image right reveals more of its left side, so the
    // focal point (object-position) moves the opposite way from the drag.
    setPos({
      x: Math.min(100, Math.max(0, posX - dx)),
      y: Math.min(100, Math.max(0, posY - dy)),
    });
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function confirm() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    formData.set("position", `${pos.x.toFixed(1)}% ${pos.y.toFixed(1)}%`);
    startTransition(async () => {
      try {
        await updateAvatarAction(formData);
        cancel();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't upload that photo — try again.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-[var(--color-warmgray)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-black/[0.04]">
        <IconCamera className="h-4 w-4" />
        {previewUrl ? "Choose a different photo" : "Choose photo"}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={onFileChange}
        />
      </label>

      {error && <p className="text-xs text-[var(--color-plum)]">{error}</p>}

      {previewUrl && (
        <div className="flex items-center gap-4">
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="cursor-move touch-none overflow-hidden rounded-full border-2 border-[var(--color-pink)] select-none"
            style={{ width: FRAME, height: FRAME }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="New avatar preview"
              draggable={false}
              className="h-full w-full object-cover"
              style={{ objectPosition: `${pos.x}% ${pos.y}%` }}
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-[var(--color-text-secondary)]">Drag the photo to frame it.</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={confirm}
                className="rounded-full bg-[var(--color-pink)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-pink-hover)] disabled:opacity-60"
              >
                {pending ? "Uploading…" : "Use this photo"}
              </button>
              <button
                type="button"
                onClick={cancel}
                disabled={pending}
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-black/[0.04]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

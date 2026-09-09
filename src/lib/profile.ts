import { db } from "./db";
import { audit } from "./audit";
import { SessionUser, actorTypeFor } from "./auth";

export class ProfileError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 2 * 1024 * 1024; // 2MB — generous for a profile photo, small enough to live inline in Postgres

// No file storage (S3/Blob) is configured for this pilot, so the photo is
// kept as a data: URL directly on the user row. Fine at this scale; the
// first thing to swap out if photo volume ever grows past a demo/pilot.
// "50% 50%", "12.5% 100%" — two whole-or-decimal percentages. Rejects
// anything else since this string is trusted straight into a CSS
// object-position style further down the line.
const POSITION_RE = /^\d{1,3}(?:\.\d+)?% \d{1,3}(?:\.\d+)?%$/;

export async function updateAvatar(params: { session: SessionUser; file: File; position?: string | null }) {
  const { file, session, position } = params;
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new ProfileError("UNSUPPORTED_TYPE", "Please upload a JPEG, PNG, WEBP, or GIF image.");
  }
  if (file.size > MAX_BYTES) {
    throw new ProfileError("FILE_TOO_LARGE", "That image is too large — please use one under 2MB.");
  }
  if (position && !POSITION_RE.test(position)) {
    throw new ProfileError("INVALID_POSITION", "Invalid crop position.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

  await db.user.update({
    where: { id: session.id },
    data: { avatarUrl: dataUrl, avatarPosition: position ?? "50% 50%" },
  });

  await audit({
    actorType: actorTypeFor(session),
    actorId: session.id,
    action: "profile.avatar_updated",
    objectType: "user",
    objectId: session.id,
    newState: { contentType: file.type, bytes: file.size, position: position ?? "50% 50%" },
  });
}

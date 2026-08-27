import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";

const SESSION_COOKIE = "jp_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8h — short-lived per security requirements

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not configured");
  return new TextEncoder().encode(s);
}

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  platformRole: string; // member | beaurity_admin | super_admin
  partnerRoles: { partnerId: string; role: string }[];
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<void> {
  const jwt = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
  const store = await cookies();
  store.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const userId = payload.sub as string;
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { partnerUsers: { where: { status: "active" } } },
    });
    if (!user || user.status !== "active") return null;
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName ?? `${user.firstName} ${user.lastName}`,
      platformRole: user.platformRole,
      partnerRoles: user.partnerUsers.map((pu) => ({
        partnerId: pu.partnerId,
        role: pu.role,
      })),
    };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("UNAUTHENTICATED", "Authentication required.");
  return user;
}

export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

// ---- RBAC helpers (TRS 38 permissions matrix) ----

export function isBeaurityAdmin(u: SessionUser): boolean {
  return u.platformRole === "beaurity_admin" || u.platformRole === "super_admin";
}

export function isSuperAdmin(u: SessionUser): boolean {
  return u.platformRole === "super_admin";
}

export function partnerRole(u: SessionUser, partnerId: string): string | null {
  return u.partnerRoles.find((r) => r.partnerId === partnerId)?.role ?? null;
}

export function canActForPartner(u: SessionUser, partnerId: string): boolean {
  return isBeaurityAdmin(u) || partnerRole(u, partnerId) !== null;
}

export function isPartnerAdmin(u: SessionUser, partnerId: string): boolean {
  return isBeaurityAdmin(u) || partnerRole(u, partnerId) === "administrator";
}

// Audit actor type for a session (TRS 22 actor_type enum). When a partner
// scope is given, partner roles take precedence over the plain member role.
export function actorTypeFor(u: SessionUser, partnerId?: string): string {
  if (u.platformRole === "super_admin") return "super_admin";
  if (u.platformRole === "beaurity_admin") return "beaurity_admin";
  if (partnerId) {
    const role = partnerRole(u, partnerId);
    if (role === "administrator") return "partner_admin";
    if (role === "operator") return "partner_operator";
  }
  return "member";
}

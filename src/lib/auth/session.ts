import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "financepro_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 10;

export type UserRole = "SUPER_ADMIN" | "TENANT_ADMIN" | "ACCOUNTANT" | "REVIEWER" | "VIEWER";

export interface AppSession {
  userId: string;
  tenantId: string | null;
  tenantSlug: string | null;
  tenantName: string | null;
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
  mustChangePassword: boolean;
  isSuperAdmin: boolean;
}

interface CookiePayload {
  userId: string;
  exp: number;
  nonce: string;
}

function sessionSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "financepro-local-dev-secret-change-me";
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function encodeSession(payload: CookiePayload) {
  const body = base64Url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

function decodeSession(value: string | undefined): CookiePayload | null {
  if (!value) {
    return null;
  }

  const [body, signature] = value.split(".");
  if (!body || !signature) {
    return null;
  }

  const expected = sign(body);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as CookiePayload;
    return payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string) {
  const cookieStore = await cookies();
  const payload: CookiePayload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    nonce: randomBytes(8).toString("hex")
  };

  cookieStore.set(SESSION_COOKIE_NAME, encodeSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/"
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/"
  });
}

export async function getCurrentSession(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const payload = decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { tenant: true }
  });

  if (!user || user.status !== "active") {
    return null;
  }

  const isSuperAdmin = user.role === "SUPER_ADMIN";
  if (!isSuperAdmin && (!user.tenant || user.tenant.status !== "active")) {
    return null;
  }

  return {
    userId: user.id,
    tenantId: user.tenantId,
    tenantSlug: user.tenant?.slug ?? null,
    tenantName: user.tenant?.name ?? null,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    role: user.role as UserRole,
    mustChangePassword: user.mustChangePassword,
    isSuperAdmin
  };
}

export async function requireUser() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  if (session.mustChangePassword) {
    redirect("/change-password");
  }

  return session;
}

export async function requireRole(roles: UserRole[]) {
  const session = await requireUser();
  if (!roles.includes(session.role)) {
    redirect(session.isSuperAdmin ? "/admin" : "/app/inbox");
  }

  return session;
}

export async function requireSuperAdmin() {
  return requireRole(["SUPER_ADMIN"]);
}

export function requireTenantAccess(session: AppSession, tenantId: string) {
  if (session.isSuperAdmin || session.tenantId === tenantId) {
    return;
  }

  throw new Error("TENANT_ACCESS_DENIED");
}

export async function getApiSession() {
  const session = await getCurrentSession();
  if (!session) {
    return { ok: false as const, status: 401, code: "AUTH_REQUIRED", message: "Bitte melden Sie sich erneut an." };
  }

  return { ok: true as const, session };
}

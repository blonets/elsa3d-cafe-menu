import "server-only";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { ADMIN_USERNAME, isProd } from "./env";

export const SESSION_COOKIE = "elsa3d_admin";
const SESSION_DAYS = 7;

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me-0123456789abcdef";
  return new TextEncoder().encode(s);
}

export async function createSessionToken(): Promise<string> {
  return await new SignJWT({ sub: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

/** Returns true when the request carries a valid admin session cookie. */
export async function hasValidSession(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return await verifySessionToken(token);
}

/** Guard for admin pages — redirects to login when unauthenticated. */
export async function requireAdmin(): Promise<void> {
  const ok = await hasValidSession();
  if (!ok) redirect("/login");
}

export async function checkCredentials(username: string, password: string): Promise<boolean> {
  if (username !== ADMIN_USERNAME) return false;
  const rows = await db.select({ hash: settings.adminPasswordHash }).from(settings).where(eq(settings.id, 1)).limit(1);
  const hash = rows[0]?.hash;
  if (hash) return await bcrypt.compare(password, hash);
  // Fallback to env password when hash not yet initialized
  const envPass = process.env.ADMIN_PASSWORD;
  return Boolean(envPass) && password === envPass;
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    // no Domain attribute → host-only cookie, isolated to the admin subdomain
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/* ── Login rate limiting (in-memory; single container) ── */

type Attempt = { fails: number; windowStart: number; lockUntil: number };
const attempts = new Map<string, Attempt>();
const WINDOW_MS = 60_000;
const MAX_FAILS = 5;

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const a = attempts.get(ip);
  const now = Date.now();
  if (!a) return { allowed: true, retryAfterSec: 0 };
  if (a.lockUntil > now) {
    return { allowed: false, retryAfterSec: Math.ceil((a.lockUntil - now) / 1000) };
  }
  if (now - a.windowStart > WINDOW_MS && a.fails >= MAX_FAILS) {
    attempts.delete(ip);
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function recordLoginFailure(ip: string): void {
  const now = Date.now();
  let a = attempts.get(ip);
  if (!a || now - a.windowStart > WINDOW_MS) {
    a = { fails: 0, windowStart: now, lockUntil: 0 };
    attempts.set(ip, a);
  }
  a.fails += 1;
  if (a.fails >= MAX_FAILS) {
    const lockMs = Math.min(15 * 60_000 * Math.pow(2, Math.floor((a.fails - MAX_FAILS) / MAX_FAILS)), 24 * 60 * 60_000);
    a.lockUntil = now + lockMs;
  }
}

export function recordLoginSuccess(ip: string): void {
  attempts.delete(ip);
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local"
  );
}

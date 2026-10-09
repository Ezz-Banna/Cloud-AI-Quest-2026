// Minimal admin protection: one shared password from ADMIN_PASSWORD, exchanged for an HMAC-signed, httpOnly cookie.
// Enough for a hackathon demo; production should use real accounts with roles (see docs/02-product-spec.md roadmap).
//
// Sessions: each token carries a random session id that must also be in this process's in-memory session store.
// Logout removes it, so a copied cookie stops working right away. Because the store is in memory, restarting
// the server (a deploy, or Render's free plan waking from sleep) also ends every admin session; that is intended.
// The store assumes one Node process, which is how the app is deployed.
import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "bc_admin";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_SESSIONS = 1000;

function secret() {
  return process.env.ADMIN_PASSWORD ? crypto.createHash("sha256").update(`bridgecom:${process.env.ADMIN_PASSWORD}`).digest() : null;
}

// Session id -> expiry time. Kept on globalThis so every route bundle in the process shares one store.
const KEY = Symbol.for("bridgecom.adminSessions");
type G = typeof globalThis & { [KEY]?: Map<string, number> };
function sessions(): Map<string, number> {
  const g = globalThis as G;
  return (g[KEY] ??= new Map());
}

function pruneSessions(now: number) {
  const s = sessions();
  for (const [id, exp] of s) if (exp < now) s.delete(id);
  // Hard cap: drop the oldest sessions if something keeps logging in without logging out.
  while (s.size > MAX_SESSIONS) s.delete(s.keys().next().value!);
}

export function adminConfigured() {
  return !!process.env.ADMIN_PASSWORD;
}

export function checkPassword(pw: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = crypto.createHash("sha256").update(pw).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

function sign(key: Buffer, payload: string) {
  return crypto.createHmac("sha256", key).update(payload).digest("hex");
}

/** Creates a new session and returns its cookie value: `<expiry>.<session id>.<hmac>`. */
export function issueToken(now = Date.now()) {
  const key = secret();
  if (!key) return null;
  const exp = now + SESSION_TTL_MS;
  const sid = crypto.randomBytes(18).toString("base64url");
  pruneSessions(now);
  sessions().set(sid, exp);
  const payload = `${exp}.${sid}`;
  return `${payload}.${sign(key, payload)}`;
}

function parseToken(token: string | undefined, now: number): { sid: string; exp: number } | null {
  const key = secret();
  if (!key || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [expStr, sid, sig] = parts;
  const exp = Number(expStr);
  if (!/^\d+$/.test(expStr) || !sid || !sig || exp < now) return null;
  const good = sign(key, `${expStr}.${sid}`);
  if (good.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig))) return null;
  return { sid, exp };
}

export function verifyToken(token: string | undefined, now = Date.now()) {
  const t = parseToken(token, now);
  if (!t) return false;
  const stored = sessions().get(t.sid);
  return stored !== undefined && stored === t.exp && stored >= now;
}

/** Ends the session behind this token (logout). Safe to call with a missing or invalid token. */
export function revokeToken(token: string | undefined) {
  if (!token) return;
  const sid = token.split(".")[1];
  if (sid) sessions().delete(sid);
}

export async function isAdmin() {
  const c = await cookies();
  return verifyToken(c.get(ADMIN_COOKIE)?.value);
}

/** Cookie options for the admin session: HttpOnly, SameSite=Strict, Secure in production, 8 hours. */
export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}

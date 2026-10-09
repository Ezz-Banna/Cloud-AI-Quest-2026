// Minimal admin protection: one shared password from ADMIN_PASSWORD, exchanged for an HMAC-signed, httpOnly cookie.
// Enough for a hackathon demo; production should use real accounts with roles (see docs/02-product-spec.md roadmap).
import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "bc_admin";
const TTL_MS = 8 * 60 * 60 * 1000;

function secret() {
  return process.env.ADMIN_PASSWORD ? crypto.createHash("sha256").update(`bridgecom:${process.env.ADMIN_PASSWORD}`).digest() : null;
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

export function issueToken(now = Date.now()) {
  const key = secret();
  if (!key) return null;
  const exp = String(now + TTL_MS);
  const sig = crypto.createHmac("sha256", key).update(exp).digest("hex");
  return `${exp}.${sig}`;
}

export function verifyToken(token: string | undefined, now = Date.now()) {
  const key = secret();
  if (!key || !token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < now) return false;
  const good = crypto.createHmac("sha256", key).update(exp).digest("hex");
  return good.length === sig.length && crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig));
}

export async function isAdmin() {
  const c = await cookies();
  return verifyToken(c.get(ADMIN_COOKIE)?.value);
}

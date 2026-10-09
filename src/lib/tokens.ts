// Random bearer tokens for things a person owns without an account: a shared snapshot, a review request,
// an employer-created role. Only a SHA-256 hash is stored, and comparison is constant-time.
// An id is never enough on its own: every read or change of private data also needs the matching token.
import "server-only";
import crypto from "node:crypto";

export function newId(prefix: string) {
  return `${prefix}-${crypto.randomBytes(9).toString("base64url")}`;
}
export function newToken() {
  return crypto.randomBytes(24).toString("base64url");
}
export function hashToken(token: string) {
  return crypto.createHash("sha256").update(`bridgecom-token:${token}`).digest("hex");
}
export function tokenMatches(token: string | null | undefined, hash: string | undefined) {
  if (!token || !hash) return false;
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
/** Reads a bearer token from the Authorization header. Tokens are never put in URLs, so they don't land in logs. */
export function bearer(req: Request) {
  const h = req.headers.get("authorization");
  return h?.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

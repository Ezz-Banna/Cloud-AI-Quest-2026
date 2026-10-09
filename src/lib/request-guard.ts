// Request checks shared by the middleware (and unit-tested on their own): CSRF origin check and body-size caps.

export const BODY_LIMIT_DEFAULT = 64 * 1024;
export const BODY_LIMIT_IMPORT = 2 * 1024 * 1024;

export function bodyLimitFor(pathname: string): number {
  return pathname === "/api/data/import" ? BODY_LIMIT_IMPORT : BODY_LIMIT_DEFAULT;
}

/** Paths whose state-changing requests need a same-origin check (admin actions and the admin-only import). */
export function needsOriginCheck(method: string, pathname: string): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return false;
  return pathname.startsWith("/api/admin/") || pathname === "/api/data/import";
}

/**
 * CSRF defence in depth on top of SameSite=Strict: when the browser sends an Origin header, its host must be
 * this site's host. Requests without Origin (curl, older clients) pass; the admin cookie still has to be valid.
 */
export function originAllowed(headers: Headers): boolean {
  const origin = headers.get("origin");
  if (!origin) return true;
  if (origin === "null") return false;
  let originHost: string;
  try { originHost = new URL(origin).host.toLowerCase(); } catch { return false; }
  const hosts = [headers.get("host"), headers.get("x-forwarded-host")?.split(",")[0]]
    .map((h) => h?.trim().toLowerCase())
    .filter((h): h is string => !!h);
  return hosts.includes(originHost);
}

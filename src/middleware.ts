// Runs before every request: request ids, API rate limits, body-size caps, admin CSRF origin check, no-store on APIs.
// Uses the Node.js runtime so the in-memory rate limiter lives in the same process as the route handlers.
import { NextResponse, type NextRequest } from "next/server";
import { clientIp, limiter, ruleFor } from "@/lib/rate-limit";
import { bodyLimitFor, needsOriginCheck, originAllowed } from "@/lib/request-guard";

function requestId(incoming: string | null): string {
  // Accept a sane upstream id (e.g. from a proxy), otherwise make a new one.
  return incoming && /^[A-Za-z0-9._-]{8,128}$/.test(incoming) ? incoming : crypto.randomUUID();
}

function reject(status: number, error: string, id: string, extra: Record<string, string> = {}) {
  return NextResponse.json({ error }, { status, headers: { "x-request-id": id, "cache-control": "no-store", ...extra } });
}

export function middleware(req: NextRequest) {
  const id = requestId(req.headers.get("x-request-id"));
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();
  const isApi = pathname.startsWith("/api/");

  if (isApi) {
    const len = req.headers.get("content-length");
    if (len !== null && Number(len) > bodyLimitFor(pathname)) return reject(413, "Request body too large", id);

    if (needsOriginCheck(method, pathname) && !originAllowed(req.headers)) return reject(403, "Cross-site request blocked", id);

    const rule = ruleFor(method, pathname);
    if (rule) {
      const r = limiter().check(rule, clientIp(req.headers));
      if (!r.ok) {
        return reject(429, "Too many requests, please wait and try again", id, {
          "retry-after": String(r.retryAfterSec),
          "ratelimit-limit": String(r.limit),
          "ratelimit-remaining": "0",
        });
      }
    }
  }

  const headers = new Headers(req.headers);
  headers.set("x-request-id", id);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("x-request-id", id);
  if (isApi) res.headers.set("cache-control", "no-store");
  return res;
}

export const config = {
  runtime: "nodejs",
  // Skip static build assets; everything else (pages and APIs) gets a request id.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

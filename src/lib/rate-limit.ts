// In-memory sliding-window rate limiter. Good for one Node process (the Render free plan runs one);
// with several instances each would count separately, so a shared store (Redis) would be needed there.

export interface RateRule {
  /** Bucket name, so different path groups are counted separately. */
  name: string;
  limit: number;
  windowMs: number;
}

export interface RateResult {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the next request would be allowed (only meaningful when ok is false). */
  retryAfterSec: number;
}

const MAX_KEYS = 10_000;

export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();

  check(rule: RateRule, client: string, now = Date.now()): RateResult {
    const key = `${rule.name}|${client}`;
    const from = now - rule.windowMs;
    const list = (this.hits.get(key) ?? []).filter((t) => t > from);
    if (list.length >= rule.limit) {
      this.hits.set(key, list);
      const retryAfterSec = Math.max(1, Math.ceil((list[0] + rule.windowMs - now) / 1000));
      return { ok: false, limit: rule.limit, remaining: 0, retryAfterSec };
    }
    list.push(now);
    // Re-insert so the Map keeps keys in least-recently-used order for the size cap below.
    this.hits.delete(key);
    this.hits.set(key, list);
    if (this.hits.size > MAX_KEYS) this.prune(now);
    return { ok: true, limit: rule.limit, remaining: rule.limit - list.length, retryAfterSec: 0 };
  }

  private prune(now: number) {
    // Drop the oldest keys first; any key with no hits in the last hour is also dropped.
    for (const [k, v] of this.hits) {
      if (this.hits.size <= MAX_KEYS * 0.9 && v[v.length - 1] > now - 3_600_000) break;
      this.hits.delete(k);
    }
  }

  reset() {
    this.hits.clear();
  }
}

export const RULES = {
  adminLogin: { name: "admin-login", limit: 5, windowMs: 15 * 60_000 },
  ai: { name: "ai", limit: 20, windowMs: 60_000 },
  apiWrite: { name: "api-write", limit: 60, windowMs: 60_000 },
} satisfies Record<string, RateRule>;

/** Which rule applies to a request, or null when it is not rate limited. */
export function ruleFor(method: string, pathname: string): RateRule | null {
  if (pathname === "/api/admin/login") return method === "POST" ? RULES.adminLogin : null;
  if (pathname.startsWith("/api/ai/")) return RULES.ai;
  if (pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(method)) return RULES.apiWrite;
  return null;
}

/** Client IP: first hop of X-Forwarded-For (set by Render's proxy), then X-Real-IP. */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  const first = xff?.split(",")[0]?.trim();
  if (first) return first;
  return headers.get("x-real-ip")?.trim() || "unknown";
}

// One limiter per process, kept on globalThis so every bundle that imports this file shares it.
const KEY = Symbol.for("bridgecom.rateLimiter");
type G = typeof globalThis & { [KEY]?: SlidingWindowLimiter };
export function limiter(): SlidingWindowLimiter {
  const g = globalThis as G;
  return (g[KEY] ??= new SlidingWindowLimiter());
}

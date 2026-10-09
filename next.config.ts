import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Content-Security-Policy.
// script-src keeps 'unsafe-inline' because Next.js App Router streams inline bootstrap scripts
// (self.__next_f.push(...)) into every page. The alternative, a per-request nonce set in middleware,
// forces every page to render dynamically (no static pre-rendering or caching), which is a poor trade
// for this small app. All scripts still have to come from this origin; no third-party script hosts and
// no 'unsafe-eval' in production (dev mode needs eval for React Refresh).
// style-src keeps 'unsafe-inline' for React style={{...}} attributes and next/font's injected styles.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self'${isProd ? "" : " ws: wss:"}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // HTTPS is terminated by Render, so HSTS is only sent from production builds (never on local http dev).
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=15552000" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;

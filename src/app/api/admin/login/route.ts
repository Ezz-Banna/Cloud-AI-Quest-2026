import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { parseBody } from "@/lib/api";
import { ADMIN_COOKIE, adminConfigured, adminCookieOptions, checkPassword, issueToken } from "@/lib/admin";
import { originAllowed } from "@/lib/request-guard";

// Brute-force protection (5 attempts per 15 minutes per IP) is applied in src/middleware.ts.
export async function POST(req: Request) {
  if (!originAllowed(req.headers)) return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
  if (!adminConfigured()) return NextResponse.json({ error: "Admin is disabled: set ADMIN_PASSWORD on the server." }, { status: 503 });
  const b = await parseBody(req, z.object({ password: z.string().min(1).max(200) }));
  if (!b.ok) return b.res;
  if (!checkPassword(b.data.password)) return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, issueToken()!, adminCookieOptions());
  return res;
}

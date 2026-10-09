import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminCookieOptions, revokeToken } from "@/lib/admin";
import { originAllowed } from "@/lib/request-guard";

export async function POST(req: Request) {
  if (!originAllowed(req.headers)) return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
  const c = await cookies();
  // Server-side invalidation: the session id is removed, so the old cookie no longer works even if it was copied.
  revokeToken(c.get(ADMIN_COOKIE)?.value);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { ...adminCookieOptions(), maxAge: 0 });
  return res;
}

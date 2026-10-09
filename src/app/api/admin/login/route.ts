import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { parseBody } from "@/lib/api";
import { ADMIN_COOKIE, adminConfigured, checkPassword, issueToken } from "@/lib/admin";

export async function POST(req: Request) {
  if (!adminConfigured()) return NextResponse.json({ error: "Admin is disabled: set ADMIN_PASSWORD on the server." }, { status: 503 });
  const b = await parseBody(req, z.object({ password: z.string().min(1).max(200) }));
  if (!b.ok) return b.res;
  if (!checkPassword(b.data.password)) return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, issueToken()!, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1", path: "/", maxAge: 8 * 3600 });
  return res;
}

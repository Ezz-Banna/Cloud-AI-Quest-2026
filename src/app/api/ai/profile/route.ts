import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { parseBody } from "@/lib/api";
import { interpretProfile } from "@/lib/ai/modules";

const Body = z.object({ answers: z.array(z.object({ q: z.string().max(500), a: z.string().max(2000) })).min(1).max(20) });
export async function POST(req: Request) {
  const b = await parseBody(req, Body);
  if (!b.ok) return b.res;
  return NextResponse.json(await interpretProfile(b.data.answers));
}

import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { parseBody } from "@/lib/api";
import { parseJob } from "@/lib/ai/modules";

const Body = z.object({ text: z.string().min(20).max(8000) });
export async function POST(req: Request) {
  const b = await parseBody(req, Body);
  if (!b.ok) return b.res;
  return NextResponse.json(await parseJob(b.data.text));
}

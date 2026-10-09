import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { parseBody } from "@/lib/api";
import { isAdmin } from "@/lib/admin";
import { extractCurriculum } from "@/lib/ai/modules";

// Admin tool: read pasted study-plan text into curriculum topics, each backed by an exact quote.
// Nothing is saved here; the admin reviews the topics and saves the record.
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const b = await parseBody(req, z.object({ text: z.string().min(20).max(40000) }));
  if (!b.ok) return b.res;
  return NextResponse.json(await extractCurriculum(b.data.text));
}

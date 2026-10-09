import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { parseBody } from "@/lib/api";
import { extractSkills } from "@/lib/ai/modules";

const Body = z.object({ title: z.string().min(2).max(200), description: z.string().min(5).max(4000), links: z.array(z.string().max(500)).max(10).default([]) });
export async function POST(req: Request) {
  const b = await parseBody(req, Body);
  if (!b.ok) return b.res;
  return NextResponse.json(await extractSkills(b.data.title, b.data.description, b.data.links));
}

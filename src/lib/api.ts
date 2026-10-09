import "server-only";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function parseBody<S extends z.ZodType>(req: Request, schema: S): Promise<{ ok: true; data: z.infer<S> } | { ok: false; res: NextResponse }> {
  let raw: unknown;
  try { raw = await req.json(); } catch { return { ok: false, res: bad("Request body must be JSON") }; }
  const r = schema.safeParse(raw);
  if (!r.success) return { ok: false, res: bad(r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")) };
  return { ok: true, data: r.data };
}

const Level = z.number().int().min(0).max(3);
export const ProfileInput = z.object({
  language: z.enum(["en", "ar"]).default("en"),
  tawjihi_avg: z.number().min(0).max(100).nullable().optional(),
  stream: z.string().nullable().optional(),
  interests: z.array(z.string()).max(20).default([]),
  dream_careers: z.array(z.string().max(100)).max(20).default([]),
  career_tags: z.array(z.string().max(50)).max(30).default([]),
  budget_jod_per_year: z.number().min(0).nullable().optional(),
  financial_need: z.boolean().nullable().optional(),
  preferred_cities: z.array(z.string()).max(20).default([]),
  open_to_relocate: z.boolean().optional(),
  university_type: z.enum(["public", "private", "any"]).optional(),
  accessibility_needs: z.array(z.string().max(200)).max(10).default([]),
  strengths: z.array(z.string().max(100)).max(20).default([]),
  skills: z.array(z.object({ skill_id: z.string(), level: Level, status: z.enum(["self-reported", "evidence-attached", "practical-assessed", "issuer-verified"]), evidence: z.array(z.any()).default([]) })).max(60).default([]),
  achievements: z.array(z.any()).max(50).default([]),
  completed_courses: z.array(z.string()).max(200).default([]),
  consent_share_with_employers: z.boolean().default(false),
  name: z.string().max(80).optional(),
}).passthrough();

import "server-only";
import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { bodyLimitFor } from "@/lib/request-guard";

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Reads the body as text but stops once it passes the size cap. The middleware already rejects a large
// Content-Length; this also covers chunked uploads that send no Content-Length.
async function readCapped(req: Request, max: number): Promise<string | null> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel().catch(() => {}); return null; }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function parseBody<S extends z.ZodType>(req: Request, schema: S): Promise<{ ok: true; data: z.infer<S> } | { ok: false; res: NextResponse }> {
  let raw: unknown;
  let text: string | null;
  try { text = await readCapped(req, bodyLimitFor(new URL(req.url).pathname)); } catch { return { ok: false, res: bad("Could not read request body") }; }
  if (text === null) return { ok: false, res: bad("Request body too large", 413) };
  try { raw = JSON.parse(text); } catch { return { ok: false, res: bad("Request body must be JSON") }; }
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

import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { parseBody, ProfileInput } from "@/lib/api";
import { getPrograms, getUniversities } from "@/lib/data/repo";
import { rankPrograms } from "@/lib/engines/programs";
import { compareOptions } from "@/lib/ai/modules";
import type { LearnerProfile } from "@/lib/types";

// The server ranks again from stored records, so the AI only sees engine facts for the chosen programs.
export async function POST(req: Request) {
  const b = await parseBody(req, z.object({ profile: ProfileInput, program_ids: z.array(z.string()).min(2).max(4) }));
  if (!b.ok) return b.res;
  const profile = b.data.profile as unknown as LearnerProfile;
  const lang = profile.language === "ar" ? "ar" : "en";
  const all = rankPrograms(profile, getPrograms(), getUniversities());
  const chosen = b.data.program_ids.map((id) => all.find((m) => m.program.id === id)).filter((m) => m != null);
  if (chosen.length < 2) return NextResponse.json({ error: "Pick at least two saved programs" }, { status: 400 });
  const L = (r: { en: string; ar: string }) => (lang === "ar" ? r.ar : r.en);
  const facts = chosen.map((m) => ({
    id: m.program.id,
    program: lang === "ar" && m.program.name_ar ? m.program.name_ar : m.program.name_en,
    university: lang === "ar" && m.university.name_ar ? m.university.name_ar : m.university.name_en,
    city: m.university.city ?? null,
    eligibility: m.eligibility.status,
    fit_score: m.suitability,
    tuition_per_year_jod: m.cost.per_year_jod,
    strengths: m.strengths.map(L),
    trade_offs: m.trade_offs.map(L),
    missing: m.missing_data,
  }));
  return NextResponse.json(await compareOptions(facts, lang));
}

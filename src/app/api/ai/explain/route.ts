import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { parseBody, ProfileInput } from "@/lib/api";
import { getPrograms, getUniversities } from "@/lib/data/repo";
import { scoreProgram } from "@/lib/engines/programs";
import { explainMatch } from "@/lib/ai/modules";
import type { LearnerProfile } from "@/lib/types";

// The server recomputes the match itself, so the AI only ever sees engine facts.
export async function POST(req: Request) {
  const b = await parseBody(req, z.object({ profile: ProfileInput, program_id: z.string() }));
  if (!b.ok) return b.res;
  const prog = getPrograms().find((p) => p.id === b.data.program_id);
  const uni = prog && getUniversities().find((u) => u.id === prog.university_id);
  if (!prog || !uni) return NextResponse.json({ error: "Program not found" }, { status: 404 });
  const profile = b.data.profile as unknown as LearnerProfile;
  const lang = profile.language === "ar" ? "ar" : "en";
  const m = scoreProgram(profile, prog, uni);
  const facts = {
    program: lang === "ar" && prog.name_ar ? prog.name_ar : prog.name_en,
    university: lang === "ar" && uni.name_ar ? uni.name_ar : uni.name_en,
    city: uni.city ?? null,
    eligibility: { status: m.eligibility.status, published_min: m.eligibility.published_min, year: m.eligibility.year, student_avg: profile.tawjihi_avg },
    fit_score: m.suitability,
    tuition_per_year_jod: m.cost.per_year_jod,
    reasons: m.reasons.map((r) => ({ code: r.code, text: lang === "ar" ? r.ar : r.en })),
    missing: m.missing_data,
    trade_offs: m.trade_offs.map((r) => ({ code: r.code, text: lang === "ar" ? r.ar : r.en })),
  };
  return NextResponse.json(await explainMatch(facts, lang));
}

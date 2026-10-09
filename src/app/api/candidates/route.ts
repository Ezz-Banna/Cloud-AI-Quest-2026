import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { parseBody, ProfileInput } from "@/lib/api";
import { getCourses, getRoles, readStore, writeStore } from "@/lib/data/repo";
import { assessRole } from "@/lib/engines/gap";
import type { LearnerProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

// Employers see only candidates who opted in, and only job-related skill evidence (no names of schools, averages, cities or needs).
export function GET(req: Request) {
  const roleId = new URL(req.url).searchParams.get("role_id");
  const role = getRoles().find((r) => r.id === roleId);
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  const courses = getCourses();
  const rows = (readStore().candidates ?? []).map((c) => {
    const profile = { skills: c.skills.map((s) => ({ ...s, evidence: [] })), completed_courses: c.completed_courses } as unknown as LearnerProfile;
    const r = assessRole(role, profile, courses);
    return { id: c.id, display_name: c.display_name, shared_at: c.shared_at, readiness_pct: r.readiness_pct, ready: r.ready, gaps: r.gaps.map((g) => ({ skill_id: g.requirement.skill_id, mandatory: g.requirement.mandatory, status: g.status })) };
  }).sort((a, b) => b.readiness_pct - a.readiness_pct);
  return NextResponse.json({ role, candidates: rows });
}

const Body = z.object({ candidate_id: z.string().min(6).max(64), profile: ProfileInput, consent: z.boolean() });
export async function POST(req: Request) {
  const b = await parseBody(req, Body);
  if (!b.ok) return b.res;
  const s = readStore();
  const others = (s.candidates ?? []).filter((c) => c.id !== b.data.candidate_id);
  if (!b.data.consent) { writeStore({ ...s, candidates: others }); return NextResponse.json({ shared: false }); }
  const p = b.data.profile;
  s.candidates = [...others, {
    id: b.data.candidate_id,
    display_name: p.name?.trim() ? p.name.trim().split(/\s+/)[0] : "Candidate",
    skills: p.skills.map((x) => ({ skill_id: x.skill_id, level: x.level, status: x.status, evidence_count: x.evidence.length })),
    completed_courses: p.completed_courses,
    shared_at: new Date().toISOString(),
  }];
  writeStore(s);
  return NextResponse.json({ shared: true });
}

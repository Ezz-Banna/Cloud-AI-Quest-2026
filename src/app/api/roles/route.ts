import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { parseBody, RequirementInput } from "@/lib/api";
import { getCourses, getEmployers, getRoles, readStore, updateStore } from "@/lib/data/repo";
import { hashToken, newId, newToken } from "@/lib/tokens";
import { SKILL_BY_ID } from "@/lib/data/taxonomy";
import type { EmployerRole } from "@/lib/types";

export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json({ employers: getEmployers(), roles: getRoles() });
}

const Body = z.object({
  employer_id: z.string().optional(),
  employer_name: z.string().min(2).max(120),
  sector: z.string().max(120).default(""),
  about: z.string().max(1000).default(""),
  website: z.string().max(300).default(""),
  recommended_course_ids: z.array(z.string()).max(20).default([]),
  title: z.string().min(2).max(120),
  kind: z.enum(["job", "internship", "project"]),
  city: z.string().max(60).optional(),
  description: z.string().max(8000).default(""),
  requirements: z.array(RequirementInput).min(1).max(30),
});

export async function POST(req: Request) {
  const b = await parseBody(req, Body);
  if (!b.ok) return b.res;
  const unknown = b.data.requirements.filter((r) => r.skill_id !== null && !SKILL_BY_ID[r.skill_id]);
  if (unknown.length) return NextResponse.json({ error: `Unknown skills: ${unknown.map((u) => u.skill_id).join(", ")}` }, { status: 400 });
  const known = new Set(getCourses().map((c) => c.id));
  const badCourse = b.data.recommended_course_ids.filter((id) => !known.has(id));
  if (badCourse.length) return NextResponse.json({ error: `Unknown courses: ${badCourse.join(", ")}` }, { status: 400 });
  const existing = (readStore().employers ?? []).find((e) => e.id === b.data.employer_id);
  const empId = existing?.id ?? newId("emp");
  const role: EmployerRole = {
    id: newId("role"), employer_id: empId, title: b.data.title, kind: b.data.kind, city: b.data.city,
    description: b.data.description, requirements: b.data.requirements.map((r) => ({ ...r, level: r.level as 1 | 2 | 3 })), verification: "unverified",
    recommended_course_ids: b.data.recommended_course_ids,
  };
  const emp = { id: empId, name: b.data.employer_name, sector: b.data.sector, city: b.data.city, about: b.data.about, website: b.data.website, verification: "unverified" as const, demo: true };
  // The manage token is the only way to see who shared with this role. It is returned once and stored only as a hash.
  const token = newToken();
  const ok = updateStore((s) => {
    s.employers = [...(s.employers ?? []).filter((e) => e.id !== empId), emp];
    s.roles = [...(s.roles ?? []), role];
    s.role_tokens = { ...(s.role_tokens ?? {}), [role.id]: hashToken(token) };
  });
  if (!ok) return NextResponse.json({ error: "Could not save the role. Please try again." }, { status: 503 });
  return NextResponse.json({ role, manage_token: token });
}

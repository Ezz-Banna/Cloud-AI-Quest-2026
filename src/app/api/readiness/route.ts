import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { parseBody, ProfileInput } from "@/lib/api";
import { getCourses, getRoles } from "@/lib/data/repo";
import { assessRole, buildPathway } from "@/lib/engines/gap";
import type { EmployerRole, LearnerProfile } from "@/lib/types";

export async function POST(req: Request) {
  const InlineRole = z.object({
    id: z.string(), employer_id: z.string().default("pasted"), title: z.string().max(200), kind: z.enum(["job", "internship", "project"]).default("job"),
    description: z.string().max(8000).default(""), verification: z.enum(["verified", "partial", "unverified", "synthetic"]).default("unverified"),
    requirements: z.array(z.object({ skill_id: z.string(), level: z.number().int().min(1).max(3), mandatory: z.boolean() })).min(1).max(40),
  });
  const b = await parseBody(req, z.object({ profile: ProfileInput, role_id: z.string().optional(), role: InlineRole.optional() }));
  if (!b.ok) return b.res;
  const role = (b.data.role as EmployerRole | undefined) ?? getRoles().find((r) => r.id === b.data.role_id);
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  const profile = b.data.profile as unknown as LearnerProfile;
  const courses = getCourses();
  const readiness = assessRole(role, profile, courses);
  return NextResponse.json({ role, readiness, pathway: buildPathway(readiness, profile, courses, role.recommended_course_ids ?? []) });
}

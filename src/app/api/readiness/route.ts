import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { ComparisonProfile, parseBody, RequirementInput } from "@/lib/api";
import { getCourses, getRoles } from "@/lib/data/repo";
import { buildPathway, compareRole, type ComparisonInput } from "@/lib/engines/gap";
import type { RoleRequirement } from "@/lib/types";

// Compares recorded skills with a role's confirmed requirements. Receives only skills (id, level, evidence state)
// and completed course ids; the rest of the profile stays on the device.
const Body = z.object({
  profile: ComparisonProfile,
  language: z.enum(["en", "ar"]).default("en"),
  role_id: z.string().max(80).optional(),
  requirements: z.array(RequirementInput).max(40).optional(),
}).strict();

export async function POST(req: Request) {
  const b = await parseBody(req, Body);
  if (!b.ok) return b.res;
  const role = b.data.role_id ? getRoles().find((r) => r.id === b.data.role_id) : undefined;
  if (b.data.role_id && !role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  const requirements = (b.data.requirements as RoleRequirement[] | undefined) ?? role?.requirements ?? [];
  const courses = getCourses();
  const input = b.data.profile as ComparisonInput;
  const comparison = compareRole(requirements, input, courses);
  const pathway = buildPathway(comparison, { ...input, language: b.data.language }, courses, role?.recommended_course_ids ?? []);
  return NextResponse.json({ role_id: role?.id ?? null, comparison, pathway });
}

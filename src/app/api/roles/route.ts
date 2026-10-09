import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { parseBody } from "@/lib/api";
import { getEmployers, getRoles, readStore, writeStore } from "@/lib/data/repo";
import { SKILL_BY_ID } from "@/lib/data/taxonomy";
import type { EmployerRole } from "@/lib/types";

export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json({ employers: getEmployers(), roles: getRoles() });
}

const Body = z.object({
  employer_name: z.string().min(2).max(120),
  sector: z.string().max(120).default(""),
  title: z.string().min(2).max(120),
  kind: z.enum(["job", "internship", "project"]),
  city: z.string().max(60).optional(),
  description: z.string().max(8000).default(""),
  requirements: z.array(z.object({ skill_id: z.string(), level: z.number().int().min(1).max(3), mandatory: z.boolean() })).min(1).max(30),
});

export async function POST(req: Request) {
  const b = await parseBody(req, Body);
  if (!b.ok) return b.res;
  const unknown = b.data.requirements.filter((r) => !SKILL_BY_ID[r.skill_id]);
  if (unknown.length) return NextResponse.json({ error: `Unknown skills: ${unknown.map((u) => u.skill_id).join(", ")}` }, { status: 400 });
  const s = readStore();
  const empId = `emp-${Date.now().toString(36)}`;
  const role: EmployerRole = {
    id: `role-${Date.now().toString(36)}`, employer_id: empId, title: b.data.title, kind: b.data.kind, city: b.data.city,
    description: b.data.description, requirements: b.data.requirements.map((r) => ({ ...r, level: r.level as 1 | 2 | 3 })), verification: "unverified",
  };
  s.employers = [...(s.employers ?? []), { id: empId, name: b.data.employer_name, sector: b.data.sector, verification: "unverified" }];
  s.roles = [...(s.roles ?? []), role];
  writeStore(s);
  return NextResponse.json({ role });
}

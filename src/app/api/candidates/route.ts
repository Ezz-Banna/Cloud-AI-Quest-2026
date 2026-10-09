import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { parseBody } from "@/lib/api";
import { isAdmin } from "@/lib/admin";
import { getCourses, getRoles, readStore, updateStore } from "@/lib/data/repo";
import { compareRole } from "@/lib/engines/gap";
import { bearer, hashToken, newId, newToken, tokenMatches } from "@/lib/tokens";

export const dynamic = "force-dynamic";

// Sharing is off by default and is always for one role. The person gets a private token that updates or withdraws
// the share; the employer sees shares for a role only with that role's manage token (or a signed-in admin).
// Employers see counts of what is recorded, never a score, a ranking or a hiring verdict.

const SharedSkills = z.object({
  skills: z.array(z.object({
    skill_id: z.string().max(60), level: z.number().int().min(0).max(3),
    status: z.enum(["self-reported", "evidence-attached", "awaiting-review", "reviewed", "needs-clarification"]),
    evidence_count: z.number().int().min(0).max(50).default(0),
  })).max(60),
  completed_courses: z.array(z.string().max(80)).max(200).default([]),
});

async function canSeeRole(req: Request, roleId: string) {
  if (await isAdmin()) return true;
  return tokenMatches(bearer(req), readStore().role_tokens?.[roleId]);
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const id = u.searchParams.get("id");
  if (id) {
    // The person checking their own share.
    const c = (readStore().candidates ?? []).find((x) => x.id === id);
    if (!c || !tokenMatches(bearer(req), c.token_hash)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ id: c.id, role_id: c.role_id, shared_at: c.shared_at, skills: c.skills.length });
  }
  const roleId = u.searchParams.get("role_id") ?? "";
  const role = getRoles().find((r) => r.id === roleId);
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  if (!(await canSeeRole(req, roleId))) return NextResponse.json({ error: "This role's shared profiles need its manage token" }, { status: 403 });
  const courses = getCourses();
  const rows = (readStore().candidates ?? []).filter((c) => c.role_id === roleId).map((c) => {
    const cmp = compareRole(role.requirements, { skills: c.skills.map((s) => ({ skill_id: s.skill_id, level: s.level as 0 | 1 | 2 | 3, status: s.status as never })), completed_courses: c.completed_courses }, courses);
    return { id: c.id, display_name: c.display_name, shared_at: c.shared_at, status: cmp.status, counts: cmp.counts,
      checks: cmp.checks.map((k) => ({ skill_id: k.skill_id, importance: k.importance, state: k.state, level_ok: k.level_ok })) };
  }).sort((a, b) => a.shared_at.localeCompare(b.shared_at)); // order of sharing, not a ranking
  return NextResponse.json({ role, candidates: rows });
}

const Create = SharedSkills.extend({ role_id: z.string().max(80), display_name: z.string().max(40).optional(), consent: z.literal(true) }).strict();
export async function POST(req: Request) {
  const b = await parseBody(req, Create);
  if (!b.ok) return b.res;
  if (!getRoles().some((r) => r.id === b.data.role_id)) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  const id = newId("share");
  const token = newToken();
  const ok = updateStore((s) => {
    s.candidates = [...(s.candidates ?? []), {
      id, token_hash: hashToken(token), role_id: b.data.role_id,
      display_name: b.data.display_name?.trim().split(/\s+/)[0] || "Candidate",
      skills: b.data.skills, completed_courses: b.data.completed_courses, shared_at: new Date().toISOString(),
    }];
  });
  if (!ok) return NextResponse.json({ error: "Could not save. Your profile was not shared." }, { status: 503 });
  return NextResponse.json({ shared: true, id, token, role_id: b.data.role_id });
}

const Update = SharedSkills.extend({ id: z.string().max(80) }).strict();
export async function PUT(req: Request) {
  const b = await parseBody(req, Update);
  if (!b.ok) return b.res;
  const c = (readStore().candidates ?? []).find((x) => x.id === b.data.id);
  if (!c || !tokenMatches(bearer(req), c.token_hash)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ok = updateStore((s) => {
    const t = (s.candidates ?? []).find((x) => x.id === b.data.id);
    if (t) { t.skills = b.data.skills; t.completed_courses = b.data.completed_courses; t.shared_at = new Date().toISOString(); }
  });
  if (!ok) return NextResponse.json({ error: "Could not save the update." }, { status: 503 });
  return NextResponse.json({ shared: true, id: b.data.id });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const c = (readStore().candidates ?? []).find((x) => x.id === id);
  if (!c || !tokenMatches(bearer(req), c.token_hash)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ok = updateStore((s) => { s.candidates = (s.candidates ?? []).filter((x) => x.id !== id); });
  if (!ok) return NextResponse.json({ error: "Could not withdraw. Please try again." }, { status: 503 });
  return NextResponse.json({ shared: false });
}

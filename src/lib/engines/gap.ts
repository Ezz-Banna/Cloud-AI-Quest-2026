// Skills-gap assessment and learning pathway. Deterministic: same profile + role => same result.
// Course completion is tracked but never counts as proof of competency; evidence does.
import type { Course, EmployerRole, LearnerProfile, Level, ProfileSkill, RoleRequirement } from "../types";
import { SKILL_BY_ID } from "../data/taxonomy";

export type GapStatus = "met" | "needs-evidence" | "below-level" | "missing";

export interface SkillGap {
  requirement: RoleRequirement;
  have?: ProfileSkill;
  status: GapStatus;
  course_completed: boolean;
}

export interface Readiness {
  gaps: SkillGap[];
  mandatory_met: number;
  mandatory_total: number;
  preferred_met: number;
  preferred_total: number;
  readiness_pct: number; // weighted: mandatory 80%, preferred 20%
  ready: boolean; // all mandatory met with evidence
}

const PROVEN = new Set(["evidence-attached", "practical-assessed", "issuer-verified"]);

export function assessSkill(req: RoleRequirement, profile: LearnerProfile, courses: Course[] = []): SkillGap {
  const have = profile.skills.find((s) => s.skill_id === req.skill_id);
  const courseDone = courses.some((c) => profile.completed_courses.includes(c.id) && c.skills.includes(req.skill_id));
  let status: GapStatus;
  if (!have || have.level === 0) status = "missing";
  else if (have.level < req.level) status = "below-level";
  else if (!PROVEN.has(have.status)) status = "needs-evidence";
  else status = "met";
  return { requirement: req, have, status, course_completed: courseDone };
}

export function assessRole(role: EmployerRole, profile: LearnerProfile, courses: Course[] = []): Readiness {
  const gaps = role.requirements.map((r) => assessSkill(r, profile, courses));
  const mand = gaps.filter((g) => g.requirement.mandatory);
  const pref = gaps.filter((g) => !g.requirement.mandatory);
  // partial credit: needs-evidence 0.5, below-level by ratio * 0.5
  const credit = (g: SkillGap) =>
    g.status === "met" ? 1 : g.status === "needs-evidence" ? 0.5 : g.status === "below-level" ? 0.5 * ((g.have?.level ?? 0) / g.requirement.level) : 0;
  const avg = (xs: SkillGap[]) => (xs.length ? xs.reduce((s, g) => s + credit(g), 0) / xs.length : 1);
  const pct = Math.round((avg(mand) * 0.8 + avg(pref) * 0.2) * 100);
  return {
    gaps,
    mandatory_met: mand.filter((g) => g.status === "met").length,
    mandatory_total: mand.length,
    preferred_met: pref.filter((g) => g.status === "met").length,
    preferred_total: pref.length,
    readiness_pct: pct,
    ready: mand.every((g) => g.status === "met"),
  };
}

export interface PathwayStep {
  skill_id: string;
  target_level: Level;
  reason: "required-gap" | "prerequisite";
  for_skills: string[];
  status: GapStatus;
  course?: Course;
  alternatives: Course[];
  practical_task_en: string;
  practical_task_ar: string;
  course_completed: boolean;
}

function pickCourses(skill: string, courses: Course[], lang: "en" | "ar", level: Level): Course[] {
  const wantLevel = level <= 1 ? "beginner" : level === 2 ? "intermediate" : "advanced";
  return courses
    .filter((c) => c.skills.includes(skill))
    .map((c) => ({
      c,
      s: (c.cost === "free" ? 4 : c.cost === "freemium" ? 2 : 0) +
        (c.language === lang ? 3 : 0) +
        (c.has_practical_project ? 3 : 0) +
        (c.level === wantLevel ? 2 : c.level === "beginner" ? 1 : 0) +
        (c.verification === "verified" ? 2 : 0) +
        (c.skills[0] === skill ? 1 : 0),
    }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.c);
}

/** Orders unmet skills so prerequisites come first (topological order), then mandatory before preferred. */
export function buildPathway(readiness: Readiness, profile: LearnerProfile, courses: Course[]): PathwayStep[] {
  const needed = new Map<string, { level: Level; reason: PathwayStep["reason"]; for: Set<string>; mandatory: boolean; status: GapStatus }>();
  const levelOf = (id: string) => profile.skills.find((s) => s.skill_id === id)?.level ?? 0;

  for (const g of readiness.gaps) {
    if (g.status === "met") continue;
    needed.set(g.requirement.skill_id, { level: g.requirement.level, reason: "required-gap", for: new Set(), mandatory: g.requirement.mandatory, status: g.status });
  }
  // add missing prerequisites (basic level) transitively
  const queue = [...needed.keys()];
  while (queue.length) {
    const id = queue.shift()!;
    for (const pre of SKILL_BY_ID[id]?.prerequisites ?? []) {
      if (levelOf(pre) >= 1) continue;
      const ex = needed.get(pre);
      if (ex) { ex.for.add(id); continue; }
      needed.set(pre, { level: 1, reason: "prerequisite", for: new Set([id]), mandatory: true, status: "missing" });
      queue.push(pre);
    }
  }
  // Kahn's algorithm over the needed set
  const ids = [...needed.keys()];
  const indeg = new Map(ids.map((i) => [i, 0]));
  for (const i of ids) for (const pre of SKILL_BY_ID[i]?.prerequisites ?? []) if (needed.has(pre)) indeg.set(i, (indeg.get(i) ?? 0) + 1);
  const rank = (i: string) => (needed.get(i)!.status === "needs-evidence" ? 2 : 0) + (needed.get(i)!.mandatory ? 0 : 1);
  const ready = ids.filter((i) => indeg.get(i) === 0);
  const out: string[] = [];
  while (ready.length) {
    ready.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
    const i = ready.shift()!;
    out.push(i);
    for (const j of ids) if ((SKILL_BY_ID[j]?.prerequisites ?? []).includes(i)) {
      indeg.set(j, (indeg.get(j) ?? 0) - 1);
      if (indeg.get(j) === 0) ready.push(j);
    }
  }
  return out.map((id) => {
    const n = needed.get(id)!;
    const options = n.status === "needs-evidence" ? [] : pickCourses(id, courses, profile.language, n.level);
    const def = SKILL_BY_ID[id];
    return {
      skill_id: id,
      target_level: n.level,
      reason: n.reason,
      for_skills: [...n.for],
      status: n.status,
      course: options[0],
      alternatives: options.slice(1, 3),
      practical_task_en: def?.practical_task_en ?? "Complete a practical project and attach it as evidence.",
      practical_task_ar: def?.practical_task_ar ?? "أنجز مشروعاً عملياً وأرفقه كدليل.",
      course_completed: courses.some((c) => profile.completed_courses.includes(c.id) && c.skills.includes(id)),
    };
  });
}

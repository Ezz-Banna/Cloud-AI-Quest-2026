// Comparing recorded experience with a role's confirmed requirements, and choosing a practical next step.
// Deterministic: the same skills and requirements always give the same result. Only skills and completed courses
// are read; names, grades, cities and other personal details cannot change the comparison.
// There is deliberately no overall percentage: counts of what is known are shown instead, and nothing here is a
// prediction of being hired. An attached link is not reviewed competence, and a finished course is not proof.
import type { Course, EvidenceStatus, Level, LearnerProfile, ProfileSkill, RoleRequirement } from "../types";
import { importanceOf } from "../types";
import { SKILL_BY_ID, SKILLS } from "../data/taxonomy";

export type ExperienceState = "none-recorded" | EvidenceStatus;

export interface RequirementCheck {
  key: string;
  /** One requirement, or several alternatives where any one is enough. */
  requirements: RoleRequirement[];
  importance: "required" | "preferred";
  /** The skill compared: for alternatives, the one the person is closest on. */
  skill_id: string;
  level_needed: Level;
  level_recorded: Level;
  state: ExperienceState;
  /** null when nothing is recorded, so no judgement is made. */
  level_ok: boolean | null;
  course_completed: boolean;
}

export type ComparisonStatus = "insufficient-requirements" | "no-experience-recorded" | "compared";

export interface NextAction {
  kind: "confirm-requirements" | "describe-experience" | "learn" | "attach-work" | "request-review" | "clarify" | "none";
  skill_id?: string;
}

export interface Comparison {
  status: ComparisonStatus;
  checks: RequirementCheck[];
  /** Read from the posting but not compared: unclear wording or skills outside the skill list. */
  not_assessed: RoleRequirement[];
  /** The posting says these are not needed; excluded from the comparison and from learning. */
  excluded: RoleRequirement[];
  counts: {
    required: number;
    required_recorded: number; // experience recorded at the requested level, any evidence state
    required_with_evidence: number; // ...with work attached (attached, awaiting review, reviewed)
    required_reviewed: number;
    preferred: number;
    preferred_recorded: number;
  };
  next_action: NextAction;
}

const WITH_EVIDENCE = new Set<ExperienceState>(["evidence-attached", "awaiting-review", "reviewed", "needs-clarification"]);

type SkillInput = Pick<ProfileSkill, "skill_id" | "level" | "status">;
export interface ComparisonInput { skills: SkillInput[]; completed_courses: string[] }

function checkOne(req: RoleRequirement, p: ComparisonInput, courses: Course[]) {
  const have = p.skills.find((s) => s.skill_id === req.skill_id && s.level > 0);
  const state: ExperienceState = have ? have.status : "none-recorded";
  return {
    skill_id: req.skill_id!,
    level_needed: req.level,
    level_recorded: (have?.level ?? 0) as Level,
    state,
    level_ok: have ? have.level >= req.level : null,
    course_completed: courses.some((c) => p.completed_courses.includes(c.id) && c.skills.includes(req.skill_id!)),
  };
}

const closeness = (c: ReturnType<typeof checkOne>) => (c.level_ok ? 10 : 0) + (c.state === "reviewed" ? 4 : WITH_EVIDENCE.has(c.state) ? 2 : c.state === "self-reported" ? 1 : 0) + c.level_recorded;

export function compareRole(requirements: RoleRequirement[], p: ComparisonInput, courses: Course[] = []): Comparison {
  const not_assessed: RoleRequirement[] = [];
  const excluded: RoleRequirement[] = [];
  const groups = new Map<string, RoleRequirement[]>();
  for (const r of requirements) {
    const imp = importanceOf(r);
    if (imp === "not-required") { excluded.push(r); continue; }
    if (imp === "unclear" || !r.skill_id || !SKILL_BY_ID[r.skill_id]) { not_assessed.push(r); continue; }
    const key = r.alt_group ? `group:${r.alt_group}` : r.skill_id;
    const g = groups.get(key) ?? [];
    // duplicates of the same skill do not add weight: keep the strictest
    const dup = g.find((x) => x.skill_id === r.skill_id);
    if (dup) { if (r.level > dup.level) dup.level = r.level; if (imp === "required") { dup.importance = "required"; dup.mandatory = true; } continue; }
    g.push({ ...r });
    groups.set(key, g);
  }
  const checks: RequirementCheck[] = [];
  for (const [key, reqs] of groups) {
    const results = reqs.map((r) => checkOne(r, p, courses));
    const best = results.reduce((a, b) => (closeness(b) > closeness(a) ? b : a));
    const importance = reqs.some((r) => importanceOf(r) === "required") ? "required" : "preferred";
    checks.push({ key, requirements: reqs, importance, ...best });
  }
  checks.sort((a, b) => (a.importance === b.importance ? 0 : a.importance === "required" ? -1 : 1));

  const req = checks.filter((c) => c.importance === "required");
  const pref = checks.filter((c) => c.importance === "preferred");
  const recorded = (c: RequirementCheck) => c.state !== "none-recorded" && c.level_ok === true;
  const counts = {
    required: req.length,
    required_recorded: req.filter(recorded).length,
    required_with_evidence: req.filter((c) => recorded(c) && WITH_EVIDENCE.has(c.state)).length,
    required_reviewed: req.filter((c) => recorded(c) && c.state === "reviewed").length,
    preferred: pref.length,
    preferred_recorded: pref.filter(recorded).length,
  };
  const anyExperience = p.skills.some((s) => s.level > 0);
  const status: ComparisonStatus = checks.length === 0 ? "insufficient-requirements" : !anyExperience ? "no-experience-recorded" : "compared";
  return { status, checks, not_assessed, excluded, counts, next_action: nextAction(status, checks) };
}

function nextAction(status: ComparisonStatus, checks: RequirementCheck[]): NextAction {
  if (status === "insufficient-requirements") return { kind: "confirm-requirements" };
  if (status === "no-experience-recorded") return { kind: "describe-experience" };
  const order = [...checks.filter((c) => c.importance === "required"), ...checks.filter((c) => c.importance === "preferred")];
  const clarify = order.find((c) => c.state === "needs-clarification");
  if (clarify) return { kind: "clarify", skill_id: clarify.skill_id };
  const gap = order.find((c) => c.state === "none-recorded" || c.level_ok === false);
  if (gap) return { kind: "learn", skill_id: gap.skill_id };
  const self = order.find((c) => c.state === "self-reported");
  if (self) return { kind: "attach-work", skill_id: self.skill_id };
  const attached = order.find((c) => c.state === "evidence-attached");
  if (attached) return { kind: "request-review", skill_id: attached.skill_id };
  return { kind: "none" };
}

// ---------- learning and practice plan ----------

export interface PathwayStep {
  skill_id: string;
  target_level: Level;
  /** learn: no or lower experience recorded. show: experience recorded but no work attached yet. */
  kind: "learn" | "show";
  reason: "requirement" | "prerequisite";
  importance: "required" | "preferred";
  for_skills: string[];
  state: ExperienceState;
  course?: Course;
  /** The chosen course was already suggested for an earlier step and also covers this skill. */
  course_shared_with?: string;
  employer_recommended?: boolean;
  alternatives: Course[];
  practical_task_en: string;
  practical_task_ar: string;
  /** Bridgecom's own estimate for the practical task, in hours (not the course duration). */
  task_hours?: number;
  objective_en: string;
  objective_ar: string;
  prerequisites: string[];
  /** Earlier steps whose task output this task reuses. */
  builds_on: string[];
  course_completed: boolean;
}

const LEVEL_NAME = (level: Level) => (level <= 1 ? "beginner" : level === 2 ? "intermediate" : "advanced");

/** Picks the smallest relevant learning unit: narrow, free, in the person's language, at their level, with a project. */
export function rankCourses(skill: string, courses: Course[], opts: { lang: "en" | "ar"; level: Level; needed: Set<string>; preferred?: string[] }): Course[] {
  return courses
    .filter((c) => c.skills.includes(skill))
    .map((c) => {
      const extra = c.skills.filter((s) => !opts.needed.has(s)).length; // skills the person does not need here
      const hours = c.est_hours ?? 0;
      const s = ((opts.preferred ?? []).includes(c.id) ? 20 : 0) +
        (c.cost === "free" ? 4 : c.cost === "freemium" ? 2 : 0) +
        (c.language === opts.lang ? 3 : 0) +
        (c.has_practical_project ? 3 : 0) +
        (c.level === LEVEL_NAME(opts.level) ? 2 : c.level === "beginner" ? 1 : 0) +
        (c.verification === "verified" ? 2 : 0) +
        (c.skills[0] === skill ? 1 : 0) -
        extra * 3 - (hours > 100 ? 6 : hours > 40 ? 2 : 0);
      return { c, s };
    })
    .sort((a, b) => b.s - a.s || a.c.id.localeCompare(b.c.id))
    .map((x) => x.c);
}

/** Every dependency edge used for ordering: skill prerequisites plus tasks that reuse another task's output. */
export function dependencyEdges(id: string): string[] {
  const d = SKILL_BY_ID[id];
  return [...new Set([...(d?.prerequisites ?? []), ...(d?.task_builds_on ?? [])])];
}

/** Returns skill ids that sit on a dependency cycle (should be empty; a test enforces it). */
export function findCycles(): string[] {
  const state = new Map<string, 1 | 2>();
  const bad = new Set<string>();
  const visit = (id: string, stack: string[]) => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) { stack.slice(stack.indexOf(id)).forEach((x) => bad.add(x)); return; }
    state.set(id, 1);
    for (const n of dependencyEdges(id)) visit(n, [...stack, id]);
    state.set(id, 2);
  };
  for (const s of SKILLS) visit(s.id, []);
  return [...bad];
}

export function buildPathway(cmp: Comparison, p: ComparisonInput & { language?: "en" | "ar" }, courses: Course[], employerCourseIds: string[] = []): PathwayStep[] {
  const levelOf = (id: string) => p.skills.find((s) => s.skill_id === id)?.level ?? 0;
  type Need = { level: Level; kind: PathwayStep["kind"]; reason: PathwayStep["reason"]; importance: PathwayStep["importance"]; for: Set<string>; state: ExperienceState };
  const needed = new Map<string, Need>();
  for (const c of cmp.checks) {
    if (c.state === "none-recorded" || c.level_ok === false) needed.set(c.skill_id, { level: c.level_needed, kind: "learn", reason: "requirement", importance: c.importance, for: new Set(), state: c.state });
    else if (c.state === "self-reported") needed.set(c.skill_id, { level: c.level_needed, kind: "show", reason: "requirement", importance: c.importance, for: new Set(), state: c.state });
  }
  // missing prerequisites of skills still to learn (basic level), transitively
  const queue = [...needed.entries()].filter(([, n]) => n.kind === "learn").map(([id]) => id);
  while (queue.length) {
    const id = queue.shift()!;
    for (const pre of SKILL_BY_ID[id]?.prerequisites ?? []) {
      if (levelOf(pre) >= 1) continue;
      const ex = needed.get(pre);
      if (ex) { ex.for.add(id); continue; }
      needed.set(pre, { level: 1, kind: "learn", reason: "prerequisite", importance: needed.get(id)!.importance, for: new Set([id]), state: "none-recorded" });
      queue.push(pre);
    }
  }
  // order with Kahn's algorithm over prerequisites and task reuse; required before preferred, learning before showing
  const ids = [...needed.keys()];
  const deps = (i: string) => dependencyEdges(i).filter((d) => needed.has(d));
  const indeg = new Map(ids.map((i) => [i, deps(i).length]));
  const rank = (i: string) => (needed.get(i)!.importance === "required" ? 0 : 2) + (needed.get(i)!.kind === "show" ? 1 : 0);
  const ready = ids.filter((i) => indeg.get(i) === 0);
  const out: string[] = [];
  while (ready.length) {
    ready.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
    const i = ready.shift()!;
    out.push(i);
    for (const j of ids) if (deps(j).includes(i)) { indeg.set(j, indeg.get(j)! - 1); if (indeg.get(j) === 0) ready.push(j); }
  }
  for (const i of ids) if (!out.includes(i)) out.push(i); // only reachable with a dependency cycle; findCycles() is tested to be empty

  const neededSet = new Set(ids);
  const used = new Map<string, string>(); // course id -> first skill it was suggested for
  return out.map((id) => {
    const n = needed.get(id)!;
    const options = n.kind === "show" ? [] : rankCourses(id, courses, { lang: p.language ?? "en", level: n.level, needed: neededSet, preferred: employerCourseIds });
    const top = options[0];
    const sharedWith = top ? used.get(top.id) : undefined;
    if (top && !sharedWith) used.set(top.id, id);
    const def = SKILL_BY_ID[id];
    return {
      skill_id: id,
      target_level: n.level,
      kind: n.kind,
      reason: n.reason,
      importance: n.importance,
      for_skills: [...n.for],
      state: n.state,
      course: top,
      course_shared_with: sharedWith,
      employer_recommended: !!top && employerCourseIds.includes(top.id),
      alternatives: options.slice(1, 3),
      practical_task_en: def?.practical_task_en ?? "Complete a practical project and attach it.",
      practical_task_ar: def?.practical_task_ar ?? "أنجز مشروعاً عملياً وأرفقه.",
      task_hours: def?.task_hours,
      objective_en: def?.objective_en ?? `Reach the requested level in ${def?.name_en ?? id}.`,
      objective_ar: def?.objective_ar ?? `الوصول إلى المستوى المطلوب في ${def?.name_ar ?? id}.`,
      prerequisites: (def?.prerequisites ?? []).filter((x) => x !== id),
      builds_on: (def?.task_builds_on ?? []).filter((x) => neededSet.has(x)),
      course_completed: courses.some((c) => p.completed_courses.includes(c.id) && c.skills.includes(id)),
    };
  });
}

/** Only these fields leave the device for a comparison. */
export function comparisonInput(profile: Pick<LearnerProfile, "skills" | "completed_courses">): ComparisonInput {
  return { skills: profile.skills.map((s) => ({ skill_id: s.skill_id, level: s.level, status: s.status })), completed_courses: profile.completed_courses };
}

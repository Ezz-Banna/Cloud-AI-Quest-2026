// AI modules: each has a schema, a prompt, a deterministic validator and an offline fallback.
import "server-only";
import * as z from "zod/v4";
import { structured } from "./client";
import { CITIES, CURRICULUM_TOPICS, FIELDS, SKILLS, SUBJECT_TOPICS } from "../data/taxonomy";
import { fallbackJob, fallbackProfile, fallbackSkills, quoteInText, normDigits } from "./fallback";
import { logAI } from "./log";

const FIELD_IDS = FIELDS.map((f) => f.id) as [string, ...string[]];
const SKILL_IDS = SKILLS.map((s) => s.id) as [string, ...string[]];
const TOPIC_IDS = CURRICULUM_TOPICS.map((t) => t.id) as [string, ...string[]];
const SUBJECT_IDS = Object.keys(SUBJECT_TOPICS) as [string, ...string[]];

// ---------- Module 1: student profile intelligence ----------
export const ProfileDraft = z.object({
  tawjihi_avg: z.number().nullable().describe("Tawjihi or equivalent average 0-100 if the student stated it, else null"),
  stream: z.enum(["scientific", "literary", "it", "industrial", "health", "other"]).nullable(),
  interests: z.array(z.enum(FIELD_IDS)).describe("Study fields that fit what the student said"),
  dream_careers: z.array(z.string()).describe("Careers the student mentioned, in their words"),
  career_tags: z.array(z.string()).describe("Short lowercase English tags such as developer, doctor, data"),
  budget_jod_per_year: z.number().nullable().describe("Yearly tuition budget in JOD if stated, else null"),
  financial_need: z.boolean().nullable(),
  preferred_cities: z.array(z.string()),
  open_to_relocate: z.boolean().nullable(),
  university_type: z.enum(["public", "private", "any"]),
  accessibility_needs: z.array(z.string()),
  strengths: z.array(z.string()),
  subjects: z.array(z.enum(SUBJECT_IDS)).describe("School subjects the student said they enjoy"),
  learning_style: z.enum(["hands-on", "theory", "mixed"]).nullable().describe("Only if the student described how they like to learn"),
  clarifications: z.array(z.string()).describe("Short questions about anything ambiguous or missing"),
});
export type ProfileDraft = z.infer<typeof ProfileDraft>;

const PROFILE_SYSTEM = `You turn a Jordanian high-school graduate's onboarding answers (English or Arabic) into a structured profile for university guidance.
Rules:
- Only record what the student actually said. Use null or an empty list when something was not stated. Never guess a Tawjihi average or a budget.
- interests must be chosen from the allowed field ids; pick the closest fields for their interests and dream careers.
- preferred_cities must use these English names when they match: ${CITIES.join(", ")}.
- Accessibility needs are recorded in neutral, respectful language.
- clarifications: at most 3 short questions, in the student's language, about missing or contradictory information that matters for recommendations.
- Do not infer gender, religion, origin, family background, health or any other sensitive characteristic, and never narrow fields of study because of who the student is. Map ambitions to fields only from what they said they enjoy or want to do.
- If the student is unsure about their career, leave careers empty rather than inventing one.
- You are not deciding admission eligibility; that is checked separately against published rules.`;

export async function interpretProfile(answers: { q: string; a: string }[]) {
  const text = answers.map((x) => `Q: ${x.q}\nA: ${x.a}`).join("\n\n");
  const r = await structured(ProfileDraft, PROFILE_SYSTEM, `Onboarding answers:\n\n${text}`);
  if (r.ok) {
    const d = r.data;
    // deterministic validation
    if (d.tawjihi_avg != null && (d.tawjihi_avg < 0 || d.tawjihi_avg > 100)) d.tawjihi_avg = null;
    if (d.budget_jod_per_year != null && d.budget_jod_per_year < 0) d.budget_jod_per_year = null;
    // a stated average must literally appear in the answers
    let dropped = 0;
    if (d.tawjihi_avg != null && !normDigits(text).includes(String(Math.floor(d.tawjihi_avg)))) { d.tawjihi_avg = null; dropped++; }
    logAI({ module: "profile", mode: "ai", model: r.model, latency_ms: r.latency_ms, returned: 1, dropped_by_validation: dropped, notes: dropped ? "average not present in answers; removed" : undefined });
    return { mode: "ai" as const, model: r.model, latency_ms: r.latency_ms, draft: d };
  }
  logAI({ module: "profile", mode: "offline", error: r.error, returned: 1, dropped_by_validation: 0 });
  return { mode: "offline" as const, reason: r.error, draft: fallbackProfile(text) };
}

// ---------- Module 4: achievement and skill extraction ----------
export const SkillClaims = z.object({
  skills: z.array(z.object({
    skill_id: z.enum(SKILL_IDS),
    level: z.number().int().min(1).max(3).describe("1 basic, 2 working, 3 strong; judged only from what is described"),
    quote: z.string().describe("Exact words copied from the text that show this skill"),
    rationale: z.string().describe("One short sentence on why the quote shows the skill"),
  })),
  suggested_description: z.string().describe("A clearer 1-2 sentence description of the achievement using only facts in the text"),
});

const SKILLS_SYSTEM = `You help a student describe an achievement and identify skills it demonstrates.
Rules:
- Only list a skill if the text shows the student actually used it. Every skill needs an exact quote copied from the text.
- Do not invent tools, results, numbers, awards or certifications. Do not inflate levels: a tutorial project is level 1, a working app with several features is level 2, sustained professional-quality work is 3.
- suggested_description must use only facts present in the text, in the same language as the text.
- These are claims for the student to confirm, not certifications.`;

export async function extractSkills(title: string, description: string, links: string[]) {
  const text = `${title}\n${description}`;
  const r = await structured(SkillClaims, SKILLS_SYSTEM, `Achievement title: ${title}\nDescription: ${description}\nLinks: ${links.join(", ") || "none"}`);
  if (r.ok) {
    const kept = r.data.skills.filter((s) => quoteInText(s.quote, text));
    const dropped = r.data.skills.length - kept.length;
    logAI({ module: "skills", mode: "ai", model: r.model, latency_ms: r.latency_ms, returned: kept.length, dropped_by_validation: dropped, notes: dropped ? "skill quote not found in student text" : undefined });
    return { mode: "ai" as const, model: r.model, latency_ms: r.latency_ms, skills: kept, dropped_unsupported: dropped, suggested_description: r.data.suggested_description };
  }
  const fb = fallbackSkills(text);
  logAI({ module: "skills", mode: "offline", error: r.error, returned: fb.length, dropped_by_validation: 0 });
  return { mode: "offline" as const, reason: r.error, skills: fb, dropped_unsupported: 0, suggested_description: null };
}

// ---------- Module 6: employer requirement parsing ----------
export const JobParse = z.object({
  title: z.string(),
  requirements: z.array(z.object({
    skill_id: z.enum(SKILL_IDS),
    level: z.number().int().min(1).max(3),
    mandatory: z.boolean(),
    quote: z.string().describe("Exact words from the posting that state this requirement"),
  })),
  unmapped: z.array(z.string()).describe("Requirements that do not match any skill id"),
});

const JOB_SYSTEM = `You convert a job or internship posting into structured skill requirements.
Rules:
- Map each requirement to the closest allowed skill id; put anything that does not fit in unmapped.
- mandatory = the posting says required/must/essential; preferred/nice-to-have/plus = false. If unclear, mandatory = true only for core skills of the role.
- level: 1 basic/familiarity, 2 working/hands-on, 3 strong/advanced/senior.
- Each requirement needs an exact quote from the posting. Never add requirements that are not in the text.
- Ignore personal characteristics that are not job-related (age, gender, marital status, nationality unless legally required).`;

export async function parseJob(text: string) {
  const r = await structured(JobParse, JOB_SYSTEM, text);
  if (r.ok) {
    const reqs = r.data.requirements.filter((x) => quoteInText(x.quote, text));
    // dedupe by skill, keep the strictest
    const by = new Map<string, (typeof reqs)[number]>();
    for (const q of reqs) { const e = by.get(q.skill_id); if (!e || q.level > e.level || (q.mandatory && !e.mandatory)) by.set(q.skill_id, q); }
    logAI({ module: "job", mode: "ai", model: r.model, latency_ms: r.latency_ms, returned: by.size, dropped_by_validation: r.data.requirements.length - reqs.length, notes: r.data.requirements.length > reqs.length ? "requirement quote not found in posting" : undefined });
    return { mode: "ai" as const, model: r.model, latency_ms: r.latency_ms, title: r.data.title, requirements: [...by.values()], unmapped: r.data.unmapped };
  }
  const fb = fallbackJob(text);
  logAI({ module: "job", mode: "offline", error: r.error, returned: fb.requirements.length, dropped_by_validation: 0 });
  return { mode: "offline" as const, reason: r.error, ...fb };
}

// ---------- Module 9: explanation wording (facts come from the engine) ----------
export const Explanation = z.object({
  text: z.string().describe("2-3 short sentences in the requested language"),
  used_reason_codes: z.array(z.string()),
});

const EXPLAIN_SYSTEM = `You explain a university program recommendation to a Jordanian student in plain, warm language.
Rules:
- Use ONLY the facts in the JSON. Do not add facts about the university, rankings, jobs or salaries.
- Every number you write must appear in the JSON exactly.
- Mention the admission check honestly: a minimum average to apply is not a guarantee of admission. The fit score is not an admission chance.
- Mention the most important trade-off if there is one.
- If data is missing, say so briefly.
- Write in the requested language (en or ar). 2-3 sentences. List the reason codes you used.`;

export interface ExplainFacts {
  program: string; university: string; city: string | null;
  eligibility: { status: string; published_min: number | null | undefined; year: string | null | undefined; student_avg: number | null | undefined };
  fit_score: number; tuition_per_year_jod: number | null; reasons: { code: string; text: string }[]; missing: string[];
  trade_offs?: { code: string; text: string }[];
}

export function templateExplanation(f: ExplainFacts, lang: "en" | "ar") {
  const top = f.reasons.filter((r) => !r.code.startsWith("partial")).slice(0, 3).map((r) => r.text);
  if (lang === "ar") {
    const elig = f.eligibility.status === "meets-published-minimum" ? `معدلك ${f.eligibility.student_avg} يحقق الحد الأدنى للتقديم (${f.eligibility.published_min})، وهذا لا يضمن القبول.` : f.eligibility.status === "below-published-minimum" ? `معدلك أقل من الحد الأدنى للتقديم (${f.eligibility.published_min}).` : "لم نتحقق بعد من الحد الأدنى للقبول لهذا البرنامج.";
    const tr = f.trade_offs?.[0] ? ` يجب الانتباه: ${f.trade_offs[0].text}.` : "";
    return `${f.program} في ${f.university}: ${top.join("؛ ") || "لا توجد مؤشرات قوية"}. ${elig}${tr}${f.missing.length ? ` بيانات ناقصة: ${f.missing.join("، ")}.` : ""}`;
  }
  const elig = f.eligibility.status === "meets-published-minimum" ? `Your ${f.eligibility.student_avg} meets the minimum average to apply (${f.eligibility.published_min}), which does not guarantee admission.` : f.eligibility.status === "below-published-minimum" ? `Your average is below the minimum to apply (${f.eligibility.published_min}).` : "We have not verified the admission minimum for this program yet.";
  const tr = f.trade_offs?.[0] ? ` Worth weighing: ${f.trade_offs[0].text}.` : "";
  return `${f.program} at ${f.university}: ${top.join("; ") || "no strong signals either way"}. ${elig}${tr}${f.missing.length ? ` Missing data: ${f.missing.join(", ")}.` : ""}`;
}

export function numbersSupported(text: string, facts: unknown) {
  const factStr = normDigits(JSON.stringify(facts));
  const nums = normDigits(text).match(/\d+(?:\.\d+)?/g) ?? [];
  return nums.every((n) => factStr.includes(n));
}

export async function explainMatch(f: ExplainFacts, lang: "en" | "ar") {
  const r = await structured(Explanation, EXPLAIN_SYSTEM, `Language: ${lang}\nFacts:\n${JSON.stringify(f)}`, 1500);
  const codes = new Set([...f.reasons, ...(f.trade_offs ?? [])].map((x) => x.code));
  if (r.ok) {
    const okCodes = r.data.used_reason_codes.every((c) => codes.has(c) || c === "eligibility");
    const okNums = numbersSupported(r.data.text, f);
    if (okCodes && okNums) {
      logAI({ module: "explain", mode: "ai", model: r.model, latency_ms: r.latency_ms, returned: 1, dropped_by_validation: 0 });
      return { mode: "ai" as const, model: r.model, text: r.data.text };
    }
    logAI({ module: "explain", mode: "offline", model: r.model, returned: 0, dropped_by_validation: 1, notes: !okNums ? "explanation contained a number not in the facts; replaced by template" : "explanation cited unknown reasons; replaced by template" });
    return { mode: "offline" as const, text: templateExplanation(f, lang), reason: "validation" };
  }
  logAI({ module: "explain", mode: "offline", error: r.error, returned: 1, dropped_by_validation: 0 });
  return { mode: "offline" as const, text: templateExplanation(f, lang), reason: r.error };
}

// ---------- Module 9b: comparing options (facts come from the engine) ----------
export const Comparison = z.object({
  text: z.string().describe("3-5 short sentences in the requested language"),
  used_program_ids: z.array(z.string()),
});

const COMPARE_SYSTEM = `You help a Jordanian student compare university programs they saved.
Rules:
- Use ONLY the facts in the JSON. No rankings, reputations, salaries, job guarantees or admission chances.
- Every number you write must appear in the JSON exactly.
- Point out the real trade-offs between the options (cost, location, eligibility, missing data) and what each option is strongest on.
- Do not tell the student which one to choose; end with what they could check next (for example missing data).
- Write in the requested language (en or ar). List the program ids you mentioned.`;

export interface CompareFacts {
  id: string; program: string; university: string; city: string | null; eligibility: string; fit_score: number;
  tuition_per_year_jod: number | null; strengths: string[]; trade_offs: string[]; missing: string[];
}

export function templateComparison(fs: CompareFacts[], lang: "en" | "ar") {
  const lines = fs.map((f) => lang === "ar"
    ? `${f.program} (${f.university}): أبرز ما فيه ${f.strengths[0] ?? "لا توجد نقطة قوة واضحة"}؛ ${f.trade_offs[0] ? `يجب الانتباه إلى ${f.trade_offs[0]}` : "لا توجد مقايضات واضحة"}${f.missing.length ? `؛ بيانات ناقصة: ${f.missing.join("، ")}` : ""}.`
    : `${f.program} (${f.university}): strongest on ${f.strengths[0] ?? "nothing in particular"}; ${f.trade_offs[0] ? `watch out for ${f.trade_offs[0]}` : "no clear trade-off"}${f.missing.length ? `; missing: ${f.missing.join(", ")}` : ""}.`);
  return lines.join(" ");
}

export async function compareOptions(fs: CompareFacts[], lang: "en" | "ar") {
  const r = await structured(Comparison, COMPARE_SYSTEM, `Language: ${lang}\nOptions:\n${JSON.stringify(fs)}`, 2000);
  if (r.ok) {
    const ids = new Set(fs.map((f) => f.id));
    const ok = r.data.used_program_ids.every((i) => ids.has(i)) && numbersSupported(r.data.text, fs);
    if (ok) {
      logAI({ module: "compare", mode: "ai", model: r.model, latency_ms: r.latency_ms, returned: 1, dropped_by_validation: 0 });
      return { mode: "ai" as const, model: r.model, text: r.data.text };
    }
    logAI({ module: "compare", mode: "offline", model: r.model, returned: 0, dropped_by_validation: 1, notes: "comparison failed validation; replaced by template" });
    return { mode: "offline" as const, text: templateComparison(fs, lang), reason: "validation" };
  }
  logAI({ module: "compare", mode: "offline", error: r.error, returned: 1, dropped_by_validation: 0 });
  return { mode: "offline" as const, text: templateComparison(fs, lang), reason: r.error };
}

// ---------- Module 2b: reading a published study plan (admin tool) ----------
export const CurriculumRead = z.object({
  topics: z.array(z.object({
    topic_id: z.enum(TOPIC_IDS),
    quote: z.string().describe("Exact course title or phrase from the study plan that shows this topic"),
  })),
  internship_quote: z.string().nullable().describe("Exact text about practical training or internship, or null"),
});

const CURRICULUM_SYSTEM = `You read a university study plan (course list) and tag which curriculum topics it covers.
Rules:
- Choose only from the allowed topic ids, and only when a course title in the text clearly covers that topic.
- Each topic needs an exact quote (a course title) copied from the text.
- internship_quote: copy the exact text about practical training or internship if present, else null.
- Do not add anything that is not in the text.`;

export function fallbackCurriculum(text: string) {
  const t = text.toLowerCase();
  const topics = CURRICULUM_TOPICS.flatMap((tp) => {
    const kw = tp.keywords.find((k) => k.length > 3 && t.includes(k));
    if (!kw) return [];
    const line = text.split(/\n/).find((l) => l.toLowerCase().includes(kw)) ?? kw;
    return [{ topic_id: tp.id, quote: line.trim().slice(0, 160) }];
  });
  const il = text.split(/\n/).find((l) => /internship|practical training|clinical training|تدريب ميداني|تدريب عملي/i.test(l));
  return { topics, internship_quote: il?.trim() ?? null };
}

export async function extractCurriculum(text: string) {
  const r = await structured(CurriculumRead, CURRICULUM_SYSTEM, text.slice(0, 20000), 2000);
  if (r.ok) {
    const kept = r.data.topics.filter((x) => quoteInText(x.quote, text));
    const by = new Map(kept.map((x) => [x.topic_id, x]));
    const intern = r.data.internship_quote && quoteInText(r.data.internship_quote, text) ? r.data.internship_quote : null;
    logAI({ module: "curriculum", mode: "ai", model: r.model, latency_ms: r.latency_ms, returned: by.size, dropped_by_validation: r.data.topics.length - kept.length });
    return { mode: "ai" as const, topics: [...by.values()], internship_quote: intern, dropped: r.data.topics.length - kept.length };
  }
  logAI({ module: "curriculum", mode: "offline", error: r.error, returned: 0, dropped_by_validation: 0 });
  return { mode: "offline" as const, reason: r.error, dropped: 0, ...fallbackCurriculum(text) };
}

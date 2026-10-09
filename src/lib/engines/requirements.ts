// Deterministic reading of a job posting into requirement candidates.
// Used directly when no AI service is available, and to cross-check AI output when it is.
// Principles: a skill that is merely mentioned is not a requirement; negation and "a plus" wording are respected;
// every item keeps the exact sentence it came from; anything the rules cannot place is surfaced for review.
import { SKILLS, type SkillDef } from "../data/taxonomy";
import type { Level, RequirementFlag, RequirementImportance, RoleRequirement } from "../types";

export type Cue = Exclude<RequirementImportance, "unclear"> | null;

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const norm = (s: string) => s.replace(/[٠-٩]/g, (c) => String(AR_DIGITS.indexOf(c))).replace(/[ًٌٍَُِّْـ]/g, "").replace(/[أإآ]/g, "ا");

// ---- cue lexicon (EN + AR; Arabic is matched after normalising alef forms and removing diacritics) ----
const NEG = [
  /\bnot (?:required|needed|necessary|mandatory|essential|a requirement|a must)\b/i,
  /\b(?:is|are)n['’]?t (?:required|needed|necessary)\b/i,
  /\bno\b[^.?!]{0,40}?\b(?:needed|required|necessary)\b/i,
  /\b(?:don['’]?t|do not|doesn['’]?t|does not|won['’]?t|will not) (?:need|require)\b/i,
  /\bnot need(?:ed)?\b/i,
  /ليست? شرطا?/, /ليست? مطلوب/, /غير مطلوب/, /لا نحتاج/, /لا يشترط/, /لا يلزم/, /لا حاجة/, /غير ضروري/, /ليست? ضروري/, /ليس من الضروري/,
];
const PREF = [
  /\bprefer(?:red|ably)?\b/i, /\bnice[- ]to[- ]have\b/i, /\b(?:is |are |a )?(?:big |strong )?plus\b/i, /\bbonus\b/i, /\badvantage(?:ous)?\b/i,
  /\bdesirable\b/i, /\bideally\b/i, /\boptional\b/i, /\bwould be (?:good|great|helpful)\b/i,
  /يفضل/, /ميزة/, /مفضل/, /اضافية/, /يعتبر ميزة/, /امر مستحسن/,
];
const REQ = [
  /\brequired\b/i, /\brequirements?\b/i, /\bmandatory\b/i, /\bmust\b/i, /\bessential\b/i, /\bnecessary\b/i, /\bneeds? to\b/i,
  /\bwe need\b/i, /\bminimum\b/i, /\bshould (?:have|know|be able)\b/i, /\bqualifications?\b/i, /\bexpected to\b/i,
  /يشترط/, /شرط/, /مطلوب/, /الزامي/, /ضروري/, /يجب/, /لا بد/, /لابد/, /متطلبات/, /المؤهلات/, /نحتاج/,
];
const STRONG = /\b(?:advanced|strong|expert|proficien\w*|senior|deep|excellent)\b|متقدم|قوي|اتقان|احتراف|اجادة|ممتاز/i;
const BASIC = /\b(?:basic|familiar\w*|exposure|beginner|introductory)\b|اساسي|مبتدئ|المام/i;

export function classifyClause(clause: string): Cue {
  const c = norm(clause);
  const neg = NEG.some((r) => r.test(c));
  const pref = PREF.some((r) => r.test(c));
  if (neg && pref) return "preferred"; // "a plus but not required"
  if (neg) return "not-required";
  if (pref) return "preferred";
  if (REQ.some((r) => r.test(c))) return "required";
  return null;
}

function levelOf(clause: string): Level {
  const c = norm(clause);
  return STRONG.test(c) ? 3 : BASIC.test(c) ? 1 : 2;
}

// ---- skill mentions ----
interface Mention { skill: SkillDef | null; label: string; start: number; end: number }

const esc = (k: string) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const LATIN = "a-z0-9#+";

interface Matcher { skill: SkillDef; re: RegExp }
const MATCHERS: Matcher[] = SKILLS.flatMap((s) => {
  const en = (s.job_keywords ?? s.keywords).map((k) =>
    k.length === 1
      ? { skill: s, re: new RegExp(`(?<![A-Za-z0-9#+])${esc(k)}(?![A-Za-z0-9#+])`, "g") } // single letters like "R" are case-sensitive
      : { skill: s, re: new RegExp(`(?<![${LATIN}])${esc(k)}(?![${LATIN}])`, "gi") });
  const ar = (s.keywords_ar ?? []).map((k) => ({ skill: s, re: new RegExp(esc(norm(k)), "g") }));
  return [...en, ...ar];
});

function findMentions(clause: string): Mention[] {
  const c = norm(clause);
  const found: Mention[] = [];
  for (const m of MATCHERS) {
    m.re.lastIndex = 0;
    for (let x = m.re.exec(c); x; x = m.re.exec(c)) found.push({ skill: m.skill, label: x[0], start: x.index, end: x.index + x[0].length });
  }
  // keep the longest match at any position, then one mention per skill per clause
  found.sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Mention[] = [];
  for (const f of found) {
    if (out.some((o) => f.start < o.end && o.start < f.end)) continue;
    if (out.some((o) => o.skill?.id === f.skill?.id)) continue;
    out.push(f);
  }
  return out;
}

// Tokens that look like tool or technology names but are not in the skill list (e.g. "SAP", "AutoCAD").
const STOP = new Set(["the", "we", "our", "you", "your", "a", "an", "and", "or", "is", "are", "in", "of", "with", "for", "to", "on", "at", "as", "be",
  "test", "vacancy", "junior", "senior", "intern", "internship", "role", "job", "experience", "knowledge", "skills", "skill", "required", "preferred",
  "mandatory", "plus", "must", "no", "not", "nice", "have", "good", "strong", "basic", "ability", "able", "work", "working", "team", "years", "year",
  "degree", "bachelor", "jordan", "amman", "irbid", "company", "candidate", "candidates", "applicants", "requirements", "requirement", "responsibilities",
  "ideally", "bonus", "advantage", "essential", "optional", "minimum", "at", "least", "it", "this", "that", "please", "apply", "send", "cv", "also",
  "analyst", "developer", "engineer", "designer", "manager", "assistant", "officer", "specialist", "use", "using", "familiarity", "proficiency", "fluent"]);

function unsupportedLabels(clause: string, known: Mention[]): string[] {
  const out: string[] = [];
  const taken = (i: number) => known.some((k) => i >= k.start && i < k.end);
  for (const m of clause.matchAll(/[A-Za-z][A-Za-z0-9+#./-]{1,24}/g)) {
    const w = m[0].replace(/[./-]+$/, "");
    if (taken(m.index!) || STOP.has(w.toLowerCase())) continue;
    // a product-like name: capitalised, all caps, or containing a digit/symbol
    if (/^[A-Z]/.test(w) || /[0-9+#]/.test(w)) out.push(w);
  }
  if (known.length === 0) {
    const c = norm(clause);
    for (const m of c.matchAll(/(?:خبرة في|خبره في|معرفة|معرفه|اتقان|اجادة|اجاده|استخدام)\s+([^\s،,.؛]+(?:\s+[^\s،,.؛]+)?)/g)) {
      const phrase = m[1].trim();
      if (!/[A-Za-z]/.test(phrase)) out.push(phrase);
    }
  }
  return [...new Set(out)];
}

// ---- sentence and clause splitting ----
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?؟])\s+|[\n\r]+|[;؛•]+|\s+-\s+/)
    .map((x) => x.replace(/^[\s\-*\d.)]+/, "").trim())
    .filter((x) => x.length > 0);
}

function clauses(sentence: string): string[] {
  return sentence.split(/,\s*(?=[^,]*\b(?:but|however)\b)|\s+(?:but|however|while|whereas)\s+|،\s*(?:لكن|ولكن|بينما)\s*|\s+(?:لكن|ولكن|بينما)\s+|,\s+|،\s*/i).map((x) => x.trim()).filter(Boolean);
}

export interface ExtractedRequirement extends RoleRequirement {
  id: string;
  label: string;
  quote: string;
  importance: RequirementImportance;
  flags: RequirementFlag[];
}

export interface Extraction {
  title: string;
  items: ExtractedRequirement[];
  /** Sentences that contained no skill and no requirement wording (kept out of the comparison). */
  ignored: string[];
  /** Sentences that read like instructions to a machine rather than a job requirement; never used. */
  suspicious: string[];
}

const INJECTION = /\b(?:ignore|disregard|forget)\b[^.]{0,30}\b(?:instructions?|prompt|rules)\b|\bsystem prompt\b|\byou are now\b|\b(?:mark|rate|score|rank)\b[^.]{0,30}\b(?:every|all|each)\b[^.]{0,20}\bcandidates?\b|تجاهل (?:كل |جميع )?التعليمات|انس التعليمات/i;

const HEADING_REQ = /^(?:requirements?|required skills|must[- ]haves?|qualifications?|what you need|المتطلبات|المؤهلات|الشروط)\s*:?\s*$/i;
const HEADING_PREF = /^(?:nice[- ]to[- ]haves?|preferred(?: skills)?|bonus(?: points)?|pluses|يفضل|مميزات اضافية|ميزات اضافية)\s*:?\s*$/i;

/** Reads a posting. Returns one item per skill (or unsupported label) with importance, level, quote and review flags. */
export function extractRequirements(text: string): Extraction {
  const sents = sentences(text.slice(0, 8000));
  type Raw = { skill: SkillDef | null; label: string; cue: Cue; level: Level; quote: string; group?: string };
  const raw: Raw[] = [];
  const ignored: string[] = [];
  let sectionCue: Cue = null;
  let groupSeq = 0;

  const suspicious: string[] = [];
  for (const sent of sents) {
    if (INJECTION.test(norm(sent))) { suspicious.push(sent); continue; }
    const headingText = sent.replace(/:$/, "");
    if (HEADING_REQ.test(norm(sent)) || HEADING_REQ.test(headingText)) { sectionCue = "required"; continue; }
    if (HEADING_PREF.test(norm(sent)) || HEADING_PREF.test(headingText)) { sectionCue = "preferred"; continue; }
    const parts = clauses(sent);
    const info = parts.map((cl) => ({ cl, cue: classifyClause(cl), mentions: findMentions(cl) }));
    if (info.every((p) => p.mentions.length === 0)) {
      // requirement wording without a known skill: keep unsupported names for review
      let any = false;
      for (const p of info) {
        if (!p.cue) continue;
        for (const label of unsupportedLabels(p.cl, [])) { raw.push({ skill: null, label, cue: p.cue, level: levelOf(p.cl), quote: sent }); any = true; }
      }
      if (!any) ignored.push(sent);
      continue;
    }
    info.forEach((p, i) => {
      // a clause with skills but no cue shares the cue of its list: a leading "Required: X, Y" or a trailing "X, Y and Z are required"
      let cue = p.cue;
      if (!cue) {
        const prev = info.slice(0, i).reverse().find((q) => q.cue);
        const next = info.slice(i + 1).find((q) => q.cue);
        cue = next?.cue ?? prev?.cue ?? sectionCue ?? null;
      }
      // alternatives: "Python or R", "بايثون أو R"
      const ms = [...p.mentions].sort((a, b) => a.start - b.start);
      const c = norm(p.cl);
      const groups: (string | undefined)[] = ms.map(() => undefined);
      for (let k = 1; k < ms.length; k++) {
        const between = c.slice(ms[k - 1].end, ms[k].start);
        if (/^\s*(?:,\s*)?(?:or|and\/or|او|أو|\/)\s*$/i.test(between)) {
          const g = groups[k - 1] ?? `alt-${++groupSeq}`;
          groups[k - 1] = g; groups[k] = g;
        }
      }
      ms.forEach((m, k) => raw.push({ skill: m.skill, label: m.label, cue, level: levelOf(p.cl), quote: sent, group: groups[k] }));
      if (cue) for (const label of unsupportedLabels(p.cl, ms)) raw.push({ skill: null, label, cue, level: levelOf(p.cl), quote: sent });
    });
  }

  // merge duplicates; contradictions become "unclear" and are flagged for review
  const byKey = new Map<string, ExtractedRequirement & { cues: Set<Cue> }>();
  for (const r of raw) {
    const key = r.skill ? r.skill.id : `x:${r.label.toLowerCase()}`;
    const ex = byKey.get(key);
    if (!ex) {
      byKey.set(key, {
        id: key, skill_id: r.skill?.id ?? null, label: r.skill ? r.label : r.label, level: r.level,
        importance: r.cue ?? "unclear", mandatory: r.cue === "required", quote: r.quote, alt_group: r.group,
        flags: [...(r.skill ? [] : ["not-in-skill-list" as const]), ...(r.cue ? [] : ["no-stated-requirement" as const])], cues: new Set([r.cue]),
      });
      continue;
    }
    ex.cues.add(r.cue);
    if (!ex.flags.includes("duplicate-merged")) ex.flags.push("duplicate-merged");
    if (r.level > ex.level) ex.level = r.level;
  }
  const items: ExtractedRequirement[] = [];
  for (const it of byKey.values()) {
    const cues = [...it.cues].filter((c): c is Exclude<Cue, null> => c !== null);
    const distinct = new Set(cues);
    if (distinct.size > 1) {
      it.importance = "unclear"; it.mandatory = false;
      it.flags = [...it.flags.filter((f) => f !== "no-stated-requirement"), "conflicting-statements"];
    } else if (distinct.size === 1) {
      it.importance = cues[0]; it.mandatory = cues[0] === "required";
      it.flags = it.flags.filter((f) => f !== "no-stated-requirement");
    }
    if (it.importance === "not-required" || it.importance === "unclear") it.alt_group = undefined;
    const { cues: _c, ...rest } = it; void _c;
    items.push(rest);
  }
  // an alternative group that ended up with one member is not a group
  const groupCount = new Map<string, number>();
  for (const i of items) if (i.alt_group) groupCount.set(i.alt_group, (groupCount.get(i.alt_group) ?? 0) + 1);
  for (const i of items) if (i.alt_group && (groupCount.get(i.alt_group) ?? 0) < 2) i.alt_group = undefined;

  const first = sents[0] ?? "";
  const title = first.replace(/^(?:test vacancy|vacancy|job title|position|role|الوظيفة|المسمى الوظيفي)\s*:\s*/i, "").slice(0, 80) || "Untitled role";
  return { title, items, ignored, suspicious };
}

/** Requirements that take part in a comparison: confirmed, in the skill list, and required or preferred. */
export function assessable(r: RoleRequirement): boolean {
  const imp = r.importance ?? (r.mandatory ? "required" : "preferred");
  return !!r.skill_id && (imp === "required" || imp === "preferred");
}

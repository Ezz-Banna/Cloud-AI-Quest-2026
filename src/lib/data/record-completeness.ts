// How complete a university or program record is. Used for badges, the admin audit and the docs.
import type { Program, University } from "../types";

const has = (v: unknown) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0);

export const PROGRAM_FIELDS: [keyof Program, string][] = [
  ["credit_hours", "credit hours"], ["tuition_jod_per_credit_hour", "tuition per credit hour"], ["additional_fees", "other mandatory fees"],
  ["min_admission_avg", "minimum average to apply"], ["historical_thresholds", "past competitive cut-offs"], ["eligible_streams", "eligible streams"],
  ["study_plan_url", "study plan"], ["curriculum_topics", "curriculum topics"], ["internship_note", "practical training"],
  ["accreditation_status", "accreditation check"], ["graduate_outcomes_note", "published graduate outcomes"], ["name_ar", "Arabic name"],
];
export const UNIVERSITY_FIELDS: [keyof University, string][] = [
  ["city", "campus location"], ["website", "website"], ["accreditation_status", "accreditation check"], ["additional_fees", "institution fees"],
  ["accessibility_facilities", "accessibility facilities"], ["transport_note", "transport"], ["accommodation_note", "accommodation"],
  ["exchange_programs", "exchange programs"], ["research_highlights", "research highlights"], ["name_ar", "Arabic name"],
];

export function recordCompleteness<T>(r: T, fields: [keyof T, string][]) {
  const missing = fields.filter(([k]) => !has(r[k])).map(([, label]) => label);
  return { pct: Math.round(((fields.length - missing.length) / fields.length) * 100), missing };
}
export const programCompleteness = (p: Program) => recordCompleteness(p, PROGRAM_FIELDS);
export const universityCompleteness = (u: University) => recordCompleteness(u, UNIVERSITY_FIELDS);

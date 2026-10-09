// Zod schemas used to validate seed files and imported data.
import * as z from "zod/v4";
import { CURRICULUM_TOPICS } from "./taxonomy";

const TOPIC_IDS = CURRICULUM_TOPICS.map((t) => t.id) as [string, ...string[]];

const Verification = z.enum(["verified", "partial", "unverified", "synthetic"]);
const Source = z.object({ url: z.string().url(), title: z.string().optional().nullable(), checked_at: z.string().optional().nullable() });
const num = z.number().nullable().optional();
const ExtraFee = z.object({ name: z.string().min(1), amount_jod: z.number().min(0).max(20000), per: z.enum(["semester", "year", "once"]), source_url: z.string().url().nullable().optional() });
const SourcedFact = z.object({ text: z.string().min(3), source_url: z.string().url(), checked_at: z.string().nullable().optional() });
const Accreditation = z.enum(["listed", "not-listed"]).nullable().optional();
const Threshold = z.object({ year: z.string().min(4), kind: z.enum(["minimum-to-apply", "competitive-cutoff"]), value: z.number().min(40).max(100), track: z.string().nullable().optional(), source_url: z.string().url() });

export const UniversitySchema = z.object({
  id: z.string().min(1), name_en: z.string().min(2), name_ar: z.string().nullable().optional(),
  type: z.enum(["public", "private"]), city: z.string().nullable().optional(), governorate: z.string().nullable().optional(),
  website: z.string().nullable().optional(), accreditation_note: z.string().nullable().optional(),
  campuses: z.array(z.string()).optional(), accreditation_status: Accreditation, accreditation_source: z.string().url().nullable().optional(),
  additional_fees: z.array(ExtraFee).optional(), exchange_programs: z.array(SourcedFact).optional(),
  research_highlights: z.array(SourcedFact).optional(), verified_achievements: z.array(SourcedFact).optional(),
  accessibility_facilities: z.array(SourcedFact).optional(), transport_note: z.string().nullable().optional(), accommodation_note: z.string().nullable().optional(),
  sources: z.array(Source), verification: Verification, notes: z.string().nullable().optional(),
});

export const ProgramSchema = z.object({
  id: z.string().min(1), university_id: z.string().min(1), name_en: z.string().min(2), name_ar: z.string().nullable().optional(),
  field: z.string().min(1), degree: z.string().nullable().optional(),
  credit_hours: num.refine((v) => v == null || (v > 30 && v < 300), "credit hours out of range"),
  tuition_jod_per_credit_hour: num.refine((v) => v == null || (v > 0 && v < 1000), "fee out of range"),
  tuition_track: z.string().nullable().optional(), tuition_year: z.string().nullable().optional(),
  min_admission_avg: num.refine((v) => v == null || (v >= 40 && v <= 100), "average out of range"),
  min_admission_year: z.string().nullable().optional(), admission_track: z.string().nullable().optional(),
  eligible_streams: z.array(z.string()).optional(), internship_note: z.string().nullable().optional(),
  career_tags: z.array(z.string()).optional(), study_plan_url: z.string().url().nullable().optional(),
  curriculum_topics: z.array(z.enum(TOPIC_IDS)).optional(), additional_fees: z.array(ExtraFee).optional(),
  historical_thresholds: z.array(Threshold).optional(), accreditation_status: Accreditation, accreditation_source: z.string().url().nullable().optional(),
  graduate_outcomes_note: z.string().nullable().optional(), verified_achievements: z.array(SourcedFact).optional(),
  sources: z.array(Source).min(1, "every program needs at least one source"), verification: Verification, notes: z.string().nullable().optional(),
});

export const ScholarshipSchema = z.object({
  id: z.string().min(1), name_en: z.string().min(2), name_ar: z.string().nullable().optional(), provider: z.string(),
  kind: z.enum(["scholarship", "grant", "loan", "sponsorship", "program"]), eligibility_text: z.string(),
  criteria: z.object({
    min_avg: num, need_based: z.boolean().nullable().optional(), fields: z.array(z.string()).optional(),
    nationality: z.string().nullable().optional(), stage: z.enum(["pre-university", "university", "graduate"]).nullable().optional(),
  }).passthrough(),
  coverage_text: z.string().nullable().optional(), url: z.string(), sources: z.array(Source), verification: Verification, notes: z.string().nullable().optional(),
});

export const CourseSchema = z.object({
  id: z.string().min(1), title: z.string().min(2), provider: z.string(), url: z.string(),
  language: z.enum(["en", "ar"]), cost: z.enum(["free", "paid", "freemium"]), skills: z.array(z.string()).min(1),
  level: z.enum(["beginner", "intermediate", "advanced"]), est_hours: num, prerequisite_skills: z.array(z.string()).optional(),
  has_practical_project: z.boolean().optional(), sources: z.array(Source), verification: Verification, notes: z.string().nullable().optional(),
});

export const DATASETS = {
  universities: UniversitySchema,
  programs: ProgramSchema,
  scholarships: ScholarshipSchema,
  courses: CourseSchema,
} as const;
export type DatasetName = keyof typeof DATASETS;

export function validateRecords<T>(schema: z.ZodType<T>, rows: unknown[]) {
  const valid: T[] = [];
  const errors: { index: number; id?: string; issues: string[] }[] = [];
  rows.forEach((r, i) => {
    const res = schema.safeParse(r);
    if (res.success) valid.push(res.data);
    else errors.push({ index: i, id: (r as { id?: string })?.id, issues: res.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`) });
  });
  return { valid, errors };
}

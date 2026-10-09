// Shared domain types for Bridgecom. Seed data follows data/verified/SCHEMA.md.

export type Verification = "verified" | "partial" | "unverified" | "synthetic";

export interface Source {
  url: string;
  title?: string;
  checked_at?: string;
}

/** A fee other than tuition per credit hour (registration, services, lab...). */
export interface ExtraFee {
  name: string;
  amount_jod: number;
  per: "semester" | "year" | "once";
  source_url?: string | null;
}

/** A sourced statement (achievement, facility, exchange program). Never written by the AI. */
export interface SourcedFact {
  text: string;
  source_url: string;
  checked_at?: string | null;
}

/** "listed" = the institution or program appears on an official list we checked (with a source); null = not checked. */
export type AccreditationStatus = "listed" | "not-listed" | null;

// Institution-level characteristics. Program-level ones live on Program.
export interface University {
  id: string;
  name_en: string;
  name_ar?: string | null;
  type: "public" | "private";
  city?: string | null;
  governorate?: string | null;
  campuses?: string[]; // cities of other campuses, when published
  website?: string | null;
  accreditation_note?: string | null;
  accreditation_status?: AccreditationStatus;
  accreditation_source?: string | null;
  additional_fees?: ExtraFee[]; // institution-wide mandatory fees
  exchange_programs?: SourcedFact[];
  research_highlights?: SourcedFact[];
  verified_achievements?: SourcedFact[];
  accessibility_facilities?: SourcedFact[];
  transport_note?: string | null;
  accommodation_note?: string | null;
  sources: Source[];
  verification: Verification;
  notes?: string | null;
}

/** A published admission threshold from a past year. Never a prediction. */
export interface HistoricalThreshold {
  year: string;
  kind: "minimum-to-apply" | "competitive-cutoff";
  value: number;
  track?: string | null;
  source_url: string;
}

/** Two data layers disagree on a fact. Set by the repository, never stored in seed files. */
export interface FactConflict {
  field: string;
  values: { value: unknown; layer: "imported" | "verified"; source?: string }[];
}

export interface Program {
  id: string;
  university_id: string;
  name_en: string;
  name_ar?: string | null;
  field: string;
  degree?: string | null;
  credit_hours?: number | null;
  tuition_jod_per_credit_hour?: number | null;
  tuition_track?: "competitive" | "parallel" | "private" | "international" | null;
  tuition_year?: string | null;
  min_admission_avg?: number | null;
  min_admission_year?: string | null;
  admission_track?: string | null;
  eligible_streams?: string[];
  internship_note?: string | null;
  career_tags?: string[];
  study_plan_url?: string | null;
  curriculum_topics?: string[]; // topic ids from CURRICULUM_TOPICS, read from the published study plan
  additional_fees?: ExtraFee[]; // program-specific mandatory fees
  historical_thresholds?: HistoricalThreshold[];
  accreditation_status?: AccreditationStatus;
  accreditation_source?: string | null;
  graduate_outcomes_note?: string | null; // only when the university publishes it
  verified_achievements?: SourcedFact[];
  conflicts?: FactConflict[];
  sources: Source[];
  verification: Verification;
  notes?: string | null;
}

export interface Scholarship {
  id: string;
  name_en: string;
  name_ar?: string | null;
  provider: string;
  kind: "scholarship" | "grant" | "loan" | "sponsorship" | "program";
  eligibility_text: string;
  criteria: {
    min_avg?: number | null;
    need_based?: boolean | null;
    fields?: string[];
    nationality?: string | null;
    stage?: "pre-university" | "university" | "graduate" | null;
  };
  coverage_text?: string | null;
  url: string;
  sources: Source[];
  verification: Verification;
  notes?: string | null;
}

export interface Course {
  id: string;
  title: string;
  provider: string;
  url: string;
  language: "en" | "ar";
  cost: "free" | "paid" | "freemium";
  skills: string[];
  level: "beginner" | "intermediate" | "advanced";
  est_hours?: number | null;
  prerequisite_skills?: string[];
  has_practical_project?: boolean;
  sources: Source[];
  verification: Verification;
  notes?: string | null;
}

/** 0 none, 1 basic, 2 working, 3 strong */
export type Level = 0 | 1 | 2 | 3;

export type EvidenceStatus =
  | "self-reported" // claimed, nothing attached
  | "evidence-attached" // link/file attached, not checked by Bridgecom
  | "practical-assessed" // completed a practical task reviewed by a person
  | "issuer-verified"; // verified credential from the issuer (future)

export interface ProfileSkill {
  skill_id: string;
  level: Level;
  status: EvidenceStatus;
  evidence: { kind: "quote" | "link" | "file" | "course"; value: string; achievement_id?: string }[];
}

export interface Achievement {
  id: string;
  kind: "project" | "certificate" | "activity" | "work" | "award" | "other";
  title: string;
  description: string;
  links: string[];
  date?: string;
}

export type Stream = "scientific" | "literary" | "it" | "industrial" | "health" | "other";

export type EducationLevel = "grade-12" | "tawjihi-graduate" | "university-student" | "graduate" | "other";
export type LearningStyle = "hands-on" | "theory" | "mixed";
/** Criteria of the fit score. Students can set a weight 0-5 for each. */
export type FitCriterion = "interest" | "curriculum" | "career" | "affordability" | "location" | "type" | "applied";
export type Priority = "affordability" | "location" | "career-fit" | "interest-fit" | "public-university" | "private-university";

export interface LearnerProfile {
  name?: string;
  education_level?: EducationLevel | null;
  subjects: string[]; // favourite school subjects
  hobbies: string[];
  industries: string[];
  priorities: Priority[]; // up to 3, most important first
  learning_style?: LearningStyle | null;
  fit_weights?: Partial<Record<FitCriterion, number>>; // student-set weights; overrides the defaults
  saved_programs: string[];
  language: "en" | "ar";
  tawjihi_avg?: number | null;
  stream?: Stream | null;
  interests: string[]; // field ids e.g. computer-science
  dream_careers: string[]; // free text careers
  career_tags: string[]; // normalised tags
  budget_jod_per_year?: number | null;
  financial_need?: boolean | null;
  preferred_cities: string[];
  open_to_relocate?: boolean;
  university_type?: "public" | "private" | "any";
  accessibility_needs: string[];
  strengths: string[];
  skills: ProfileSkill[];
  achievements: Achievement[];
  completed_courses: string[];
  consent_share_with_employers: boolean;
  updated_at?: string;
}

export interface RoleRequirement {
  skill_id: string;
  level: Level;
  mandatory: boolean;
}

export interface EmployerRole {
  id: string;
  employer_id: string;
  title: string;
  kind: "job" | "internship" | "project";
  city?: string;
  description: string;
  requirements: RoleRequirement[];
  recommended_course_ids?: string[];
  verification: Verification;
}

export interface Employer {
  id: string;
  name: string;
  sector: string;
  city?: string;
  about?: string;
  website?: string;
  demo?: boolean; // created through the demo employer portal
  verification: Verification;
}

export const emptyProfile = (): LearnerProfile => ({
  language: "en",
  education_level: null,
  subjects: [],
  hobbies: [],
  industries: [],
  priorities: [],
  saved_programs: [],
  tawjihi_avg: null,
  stream: null,
  interests: [],
  dream_careers: [],
  career_tags: [],
  budget_jod_per_year: null,
  financial_need: null,
  preferred_cities: [],
  open_to_relocate: true,
  university_type: "any",
  accessibility_needs: [],
  strengths: [],
  skills: [],
  achievements: [],
  completed_courses: [],
  consent_share_with_employers: false,
});

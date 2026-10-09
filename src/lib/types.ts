// Shared domain types for Bridgecom. Seed data follows data/verified/SCHEMA.md.

export type Verification = "verified" | "partial" | "unverified" | "synthetic";

export interface Source {
  url: string;
  title?: string;
  checked_at?: string;
}

export interface University {
  id: string;
  name_en: string;
  name_ar?: string | null;
  type: "public" | "private";
  city?: string | null;
  governorate?: string | null;
  website?: string | null;
  accreditation_note?: string | null;
  sources: Source[];
  verification: Verification;
  notes?: string | null;
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
export type Priority = "affordability" | "location" | "career-fit" | "interest-fit" | "public-university" | "private-university";

export interface LearnerProfile {
  name?: string;
  education_level?: EducationLevel | null;
  subjects: string[]; // favourite school subjects
  hobbies: string[];
  industries: string[];
  priorities: Priority[]; // up to 3, most important first
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

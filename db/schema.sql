-- Bridgecom relational schema (PostgreSQL / Supabase). The MVP reads the same shapes from JSON seed files
-- through src/lib/data/repo.ts; switching to this schema changes only that repository layer.

create type verification as enum ('verified', 'partial', 'unverified', 'synthetic');
create type evidence_status as enum ('self-reported', 'evidence-attached', 'practical-assessed', 'issuer-verified');

-- Provenance: every factual record links to one or more sources with the date they were checked.
create table sources (
  id bigserial primary key,
  url text not null,
  title text,
  checked_at date not null,
  publisher text,
  unique (url, checked_at)
);

create table universities (
  id text primary key,                 -- e.g. 'just'
  name_en text not null,
  name_ar text,
  type text not null check (type in ('public', 'private')),
  city text,
  governorate text,
  website text,
  accreditation_note text,
  accreditation_status text check (accreditation_status in ('listed', 'not-listed')),  -- null = not checked
  accreditation_source_id bigint references sources(id),
  transport_note text,
  accommodation_note text,
  verification verification not null default 'unverified',
  notes text,
  updated_at timestamptz not null default now()
);

-- Institution-level facts that are lists. Each row must cite a source; the AI never writes these.
create table university_campuses (university_id text references universities(id) on delete cascade, city text not null, primary key (university_id, city));
create table university_facts (
  id bigserial primary key,
  university_id text not null references universities(id) on delete cascade,
  kind text not null check (kind in ('exchange-program', 'research-highlight', 'verified-achievement', 'accessibility-facility')),
  text text not null,
  source_id bigint not null references sources(id)
);

create table fields (
  id text primary key,                 -- e.g. 'computer-science'
  name_en text not null,
  name_ar text not null,
  nominal_years smallint not null
);

create table programs (
  id text primary key,
  university_id text not null references universities(id),
  field_id text not null references fields(id),
  name_en text not null,
  name_ar text,
  degree text,
  credit_hours smallint check (credit_hours between 30 and 300),
  verification verification not null default 'unverified',
  internship_note text,
  career_tags text[] not null default '{}',
  study_plan_url text,
  study_plan_source_id bigint references sources(id),
  accreditation_status text check (accreditation_status in ('listed', 'not-listed')),
  accreditation_source_id bigint references sources(id),
  graduate_outcomes_note text,          -- only when the university publishes outcomes
  notes text,
  updated_at timestamptz not null default now()
);

-- Curriculum topics read from the published study plan (program-level), each with the course title that shows it.
create table curriculum_topics (id text primary key, name_en text not null, name_ar text not null);
create table program_topics (
  program_id text references programs(id) on delete cascade,
  topic_id text references curriculum_topics(id),
  evidence_quote text not null,        -- exact course title from the study plan
  primary key (program_id, topic_id)
);

-- Mandatory fees other than per-credit-hour tuition (registration, services, labs). university-wide when program_id is null.
create table extra_fees (
  id bigserial primary key,
  university_id text references universities(id) on delete cascade,
  program_id text references programs(id) on delete cascade,
  name text not null,
  amount_jod numeric(8,2) not null check (amount_jod >= 0),
  per text not null check (per in ('semester', 'year', 'once')),
  academic_year text,
  source_id bigint not null references sources(id),
  check (university_id is not null or program_id is not null)
);

-- Fees vary by track (competitive, parallel, international, private) and by year.
create table program_fees (
  id bigserial primary key,
  program_id text not null references programs(id) on delete cascade,
  track text not null,
  academic_year text,
  jod_per_credit_hour numeric(8,2) not null check (jod_per_credit_hour > 0),
  source_id bigint not null references sources(id),
  unique (program_id, track, academic_year)
);

-- Admission rules: the minimum average to apply and (separately) the competitive cut-off when published.
create table admission_rules (
  id bigserial primary key,
  program_id text not null references programs(id) on delete cascade,
  admission_track text not null,       -- 'unified-competitive', 'private-university', ...
  academic_year text not null,
  min_avg_to_apply numeric(5,2) check (min_avg_to_apply between 40 and 100),
  competitive_cutoff numeric(5,2) check (competitive_cutoff between 40 and 100),
  eligible_streams text[] not null default '{}',
  source_id bigint not null references sources(id)
);

-- Import staging and audit: every import is kept, compared with the current record, and conflicts stay open
-- until a data maintainer resolves them. Disputed facts are excluded from eligibility and scoring meanwhile.
create table import_batches (
  id bigserial primary key,
  dataset text not null,
  imported_by text not null,
  imported_at timestamptz not null default now(),
  rows_valid integer not null,
  rows_invalid integer not null
);
create table fact_conflicts (
  id bigserial primary key,
  record_type text not null,
  record_id text not null,
  field text not null,
  current_value text,
  imported_value text,
  import_batch_id bigint references import_batches(id),
  resolved_at timestamptz,
  resolved_by text,
  resolution text
);

create table record_sources (
  record_type text not null,           -- 'university' | 'program' | 'scholarship' | 'course'
  record_id text not null,
  source_id bigint not null references sources(id),
  primary key (record_type, record_id, source_id)
);

create table scholarships (
  id text primary key,
  name_en text not null,
  name_ar text,
  provider text not null,
  kind text not null check (kind in ('scholarship', 'grant', 'loan', 'sponsorship', 'program')),
  eligibility_text text not null,
  min_avg numeric(5,2),
  need_based boolean,
  fields text[] not null default '{}',
  nationality text,
  stage text check (stage in ('pre-university', 'university', 'graduate')),
  coverage_text text,
  url text not null,
  verification verification not null default 'unverified',
  notes text
);

create table skills (
  id text primary key,                 -- e.g. 'react'
  name_en text not null,
  name_ar text not null,
  category text not null,
  practical_task_en text not null,
  practical_task_ar text not null
);
create table skill_prerequisites (
  skill_id text references skills(id),
  prerequisite_id text references skills(id),
  primary key (skill_id, prerequisite_id)
);

create table courses (
  id text primary key,
  title text not null,
  provider text not null,
  url text not null,
  language text not null check (language in ('en', 'ar')),
  cost text not null check (cost in ('free', 'paid', 'freemium')),
  level text not null check (level in ('beginner', 'intermediate', 'advanced')),
  est_hours numeric(6,1),
  has_practical_project boolean not null default false,
  verification verification not null default 'unverified'
);
create table course_skills (course_id text references courses(id) on delete cascade, skill_id text references skills(id), primary key (course_id, skill_id));

-- People. Learner data is personal: minimise, encrypt at rest, row-level security by owner.
create table learners (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,            -- Supabase auth.users
  display_name text,
  language text not null default 'ar',
  tawjihi_avg numeric(5,2),
  stream text,
  budget_jod_per_year integer,
  financial_need boolean,
  preferred_cities text[] not null default '{}',
  university_type text default 'any',
  accessibility_needs text[] not null default '{}',   -- sensitive: never shared with employers
  consent_share_with_employers boolean not null default false,
  consent_updated_at timestamptz,
  created_at timestamptz not null default now()
);
-- Student-set weights for the fit score (0-5 per criterion).
create table learner_fit_weights (
  learner_id uuid references learners(id) on delete cascade,
  criterion text not null check (criterion in ('interest', 'curriculum', 'career', 'affordability', 'location', 'type', 'applied')),
  weight smallint not null check (weight between 0 and 5),
  primary key (learner_id, criterion)
);
create table learner_interests (learner_id uuid references learners(id) on delete cascade, field_id text references fields(id), primary key (learner_id, field_id));

create table achievements (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references learners(id) on delete cascade,
  kind text not null,
  title text not null,
  description text not null,
  links text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table learner_skills (
  learner_id uuid references learners(id) on delete cascade,
  skill_id text references skills(id),
  level smallint not null check (level between 0 and 3),
  status evidence_status not null default 'self-reported',
  primary key (learner_id, skill_id)
);
create table skill_evidence (
  id bigserial primary key,
  learner_id uuid not null references learners(id) on delete cascade,
  skill_id text not null references skills(id),
  kind text not null check (kind in ('quote', 'link', 'file', 'course', 'assessment')),
  value text not null,
  achievement_id uuid references achievements(id) on delete set null,
  created_at timestamptz not null default now()
);
create table course_completions (learner_id uuid references learners(id) on delete cascade, course_id text references courses(id), completed_at timestamptz not null default now(), primary key (learner_id, course_id));

create table employers (
  id text primary key,
  name text not null,
  sector text,
  city text,
  verification verification not null default 'unverified',   -- verified only after a manual check (e.g. company registry)
  created_at timestamptz not null default now()
);
create table roles (
  id text primary key,
  employer_id text not null references employers(id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('job', 'internship', 'project')),
  city text,
  description text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
create table role_requirements (
  role_id text references roles(id) on delete cascade,
  skill_id text references skills(id),
  level smallint not null check (level between 1 and 3),
  mandatory boolean not null,
  source_quote text,
  primary key (role_id, skill_id)
);

create table readiness_snapshots (
  id bigserial primary key,
  learner_id uuid not null references learners(id) on delete cascade,
  role_id text not null references roles(id) on delete cascade,
  readiness_pct smallint not null,
  computed_at timestamptz not null default now()
);

-- AI audit log: no raw personal text stored, only references, model, latency and validation outcome.
create table ai_requests (
  id bigserial primary key,
  module text not null,                -- 'profile' | 'skills' | 'job' | 'explain' | 'compare' | 'curriculum'
  learner_id uuid references learners(id) on delete set null,
  model text,
  mode text not null check (mode in ('ai', 'offline')),
  latency_ms integer,
  items_returned smallint,
  items_dropped_by_validation smallint,
  error text,
  created_at timestamptz not null default now()
);

-- Row-level security sketch (Supabase)
alter table learners enable row level security;
create policy learner_owner on learners using (auth.uid() = auth_user_id);

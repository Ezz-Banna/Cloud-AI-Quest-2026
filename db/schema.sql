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
  verification verification not null default 'unverified',
  notes text,
  updated_at timestamptz not null default now()
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
  notes text,
  updated_at timestamptz not null default now()
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
  module text not null,                -- 'profile' | 'skills' | 'job'
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

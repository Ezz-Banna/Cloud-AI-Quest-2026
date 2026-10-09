// Repository layer. MVP reads JSON seed files; swap these functions for Postgres queries (db/schema.sql) later.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Course, Employer, EmployerRole, Program, Scholarship, University } from "../types";
import { DATASETS, validateRecords, type DatasetName } from "./schemas";

const ROOT = process.cwd();
const readJson = (rel: string): unknown[] => {
  try { const v = JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8")); return Array.isArray(v) ? v : []; }
  catch { return []; }
};

/** Facts compared between imported rows and the verified seed. Disagreement is surfaced, never silently resolved. */
export const CONFLICT_FIELDS: Record<string, string[]> = {
  programs: ["tuition_jod_per_credit_hour", "credit_hours", "min_admission_avg"],
  universities: ["type", "city"],
};

export function findConflicts(field: string[], imported: Record<string, unknown> | undefined, verified: Record<string, unknown> | undefined) {
  if (!imported || !verified) return [];
  const src = (r: Record<string, unknown>) => ((r.sources as { url: string }[] | undefined) ?? [])[0]?.url;
  return field.filter((f) => imported[f] != null && verified[f] != null && imported[f] !== verified[f])
    .map((f) => ({ field: f, values: [
      { value: imported[f], layer: "imported" as const, source: src(imported) },
      { value: verified[f], layer: "verified" as const, source: src(verified) },
    ] }));
}

function load<T>(name: DatasetName): { rows: T[]; invalid: number } {
  const verified = readJson(`data/verified/${name}.json`);
  const imported = readJson(`data/runtime/imported-${name}.json`);
  const overrides = readJson(`data/runtime/overrides-${name}.json`);
  // Admin edits win over imports, which win over the seed files (first id seen is kept).
  // Where an import disagrees with the verified seed on a key fact, the record carries `conflicts`
  // and the engines treat that fact as unknown until an admin resolves it (an admin edit clears it).
  const { valid, errors } = validateRecords(DATASETS[name] as never, [...overrides, ...imported, ...verified]);
  const byLayer = (rows: unknown[]) => Object.fromEntries((rows as Record<string, unknown>[]).filter((r) => r && typeof r.id === "string").map((r) => [r.id as string, r]));
  const imp = byLayer(imported), ver = byLayer(verified), ovr = byLayer(overrides);
  const fields = CONFLICT_FIELDS[name] ?? [];
  const seen = new Set<string>();
  const rows = (valid as (T & { id: string })[]).filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
    .map((r) => {
      if (!fields.length || ovr[r.id]) return r;
      const c = findConflicts(fields, imp[r.id], ver[r.id]);
      return c.length ? { ...r, conflicts: c } : r;
    });
  return { rows, invalid: errors.length };
}

export const getUniversities = () => load<University>("universities").rows;
export const getPrograms = () => load<Program>("programs").rows;
export const getScholarships = () => load<Scholarship>("scholarships").rows;
export const getCourses = () => load<Course>("courses").rows;

export function getEmployers(): Employer[] {
  return [...(readJson("data/synthetic/employers.json") as Employer[]), ...(readStore().employers ?? [])];
}
export function getRoles(): EmployerRole[] {
  return [...(readJson("data/synthetic/roles.json") as EmployerRole[]), ...(readStore().roles ?? [])];
}

export function coverage() {
  const out: Record<string, { total: number; verified: number; partial: number; other: number; invalid: number }> = {};
  for (const name of Object.keys(DATASETS) as DatasetName[]) {
    const { rows, invalid } = load<{ verification: string }>(name);
    out[name] = {
      total: rows.length,
      verified: rows.filter((r) => r.verification === "verified").length,
      partial: rows.filter((r) => r.verification === "partial").length,
      other: rows.filter((r) => !["verified", "partial"].includes(r.verification)).length,
      invalid,
    };
  }
  return out;
}

// ----- runtime store (shared snapshots, review requests, employer-created roles) -----
/** What a person chose to share with one employer role: skills and completed courses only. */
export interface CandidateSnapshot {
  id: string;
  token_hash: string;
  role_id: string;
  display_name: string;
  skills: { skill_id: string; level: number; status: string; evidence_count: number }[];
  completed_courses: string[];
  shared_at: string;
}
export interface ReviewRequest {
  id: string;
  token_hash: string;
  skill_id: string;
  level: number;
  /** Only the links and notes for this one skill, copied when the person asked for review. */
  evidence: { kind: string; value: string }[];
  requested_at: string;
  decision?: "reviewed" | "needs-clarification";
  reason?: string;
  rubric?: { criterion: string; met: boolean }[];
  reviewer?: string;
  decided_at?: string;
}
export interface Store {
  employers?: Employer[];
  roles?: EmployerRole[];
  /** role id -> hash of the token the employer received when creating it */
  role_tokens?: Record<string, string>;
  candidates?: CandidateSnapshot[];
  reviews?: ReviewRequest[];
}
const storePath = () => process.env.BRIDGECOM_STORE_PATH || path.join(ROOT, "data/runtime/store.json");

export function readStore(): Store {
  try { return JSON.parse(fs.readFileSync(storePath(), "utf8")); } catch { return {}; }
}
/** Throws when the write fails (full disk, read-only file system); callers must report that, never claim success. */
export function writeStore(s: Store) {
  const STORE = storePath();
  fs.mkdirSync(path.dirname(STORE), { recursive: true });
  const tmp = `${STORE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(s, null, 2));
  try { fs.renameSync(tmp, STORE); } catch (e) { fs.rmSync(tmp, { force: true }); throw e; } // atomic replace, so a crash mid-write cannot leave half a file
}

/** Applies a change and saves it. Returns false instead of throwing so routes can answer 503. */
export function updateStore(change: (s: Store) => void): boolean {
  try { const s = readStore(); change(s); writeStore(s); return true; } catch (e) { console.error("store write failed", e); return false; }
}
export function writeImported(name: DatasetName, rows: unknown[]) {
  const file = path.join(ROOT, `data/runtime/imported-${name}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(rows, null, 2));
}

export function readOverrides(name: DatasetName): { id: string }[] {
  return readJson(`data/runtime/overrides-${name}.json`) as { id: string }[];
}
export function writeOverrides(name: DatasetName, rows: unknown[]) {
  const file = path.join(ROOT, `data/runtime/overrides-${name}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(rows, null, 2));
}
export function getAll(name: DatasetName) {
  return load<{ id: string }>(name).rows;
}

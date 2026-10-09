// Builds the measured data audit: docs/09-data-audit-tables.md (per-record tables) and src/lib/data/coverage.json
// (counts shown in the app). Run: npm run audit:data. Every number here is counted from data/verified/*.json.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateData } from "./validate-data.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (f) => JSON.parse(readFileSync(join(ROOT, "data/verified", `${f}.json`), "utf8"));
const universities = load("universities"), programs = load("programs"), scholarships = load("scholarships");
const rules = load("admission-rules"), revisions = load("revisions");
const TODAY = process.env.AUDIT_DATE ?? new Date().toISOString().slice(0, 10);
const SECONDARY = /wikipedia\.org|jordantimes\.com|jordannews\.jo|royanews\.tv|alrai\.com|khaberni\.com|jo24\.net|hala\.jo|almamlakatv\.com|petra\.gov\.jo/i;

const official = (r) => (r.sources ?? []).some((s) => /^https:\/\//.test(s.url) && !SECONDARY.test(s.url));
const checked = (r) => (r.sources ?? []).some((s) => /^https:\/\//.test(s.url) && s.checked_at);
const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : 0);
const yearOf = (s) => Number(String(s ?? "").match(/\d{4}/)?.[0] ?? NaN);
const window = (s) => {
  const a = s.availability;
  if (!a) return "unverified";
  if (a.closes && a.closes < TODAY) return a.status === "historical" ? "historical" : "closed";
  if (a.status === "open" && a.opens && a.opens > TODAY) return "announced";
  return a.status;
};

const programsWithData = programs.filter((p) => p.tuition_jod_per_credit_hour != null && p.credit_hours != null && p.min_admission_avg != null);
const uniWithPrograms = new Set(programs.map((p) => p.university_id));
const feeOld = programs.filter((p) => p.tuition_jod_per_credit_hour != null && (!p.tuition_year || yearOf(p.tuition_year) < 2025));
const schByWindow = Object.fromEntries(["open", "announced", "closed", "historical", "unverified"].map((k) => [k, scholarships.filter((s) => window(s) === k).length]));
const VALUE = ["tuition_jod_per_credit_hour", "credit_hours", "min_admission_avg", "type", "city"];
const kindOf = (r) => r.field === "(record)" ? r.new : VALUE.includes(r.field) ? (r.old == null ? "value added" : r.new == null ? "value withheld" : "value corrected")
  : ["tuition_track", "tuition_year", "min_admission_year"].includes(r.field) ? "label corrected" : r.field === "sources" ? "source replaced" : r.field === "url" ? "link updated" : ["coverage_text", "eligibility_text"].includes(r.field) ? "text re-read at source"
  : ["availability", "verification"].includes(r.field) ? "status set" : r.field === "historical_thresholds" ? "cut-offs added" : r.field === "additional_fees" ? "fees added" : "other";
const corrections = revisions.filter((r) => r.field !== "(record)");
const byKind = {}; for (const r of revisions) byKind[kindOf(r)] = (byKind[kindOf(r)] ?? 0) + 1;
const added = revisions.filter((r) => r.field === "(record)" && r.new === "added");
const removed = revisions.filter((r) => r.field === "(record)" && r.new === "removed");
const all = [...universities, ...programs, ...scholarships];
const v = validateData({ universities, programs, scholarships }, TODAY);

const coverage = {
  measured_on: TODAY,
  universities: { total: universities.length, verified: universities.filter((u) => u.verification === "verified").length, with_programs: uniWithPrograms.size,
    public: universities.filter((u) => u.type === "public").length, private: universities.filter((u) => u.type === "private").length, special_law: universities.filter((u) => u.type === "special-law").length },
  programs: { total: programs.length, verified: programs.filter((p) => p.verification === "verified").length, with_fee_hours_and_minimum: programsWithData.length,
    with_fee: programs.filter((p) => p.tuition_jod_per_credit_hour != null).length, with_minimum: programs.filter((p) => p.min_admission_avg != null).length,
    with_competitive_cutoffs: programs.filter((p) => (p.historical_thresholds ?? []).some((t) => t.kind === "competitive-cutoff")).length,
    fees_undated_or_older_than_2025_26: feeOld.length },
  scholarships: { total: scholarships.length, verified: scholarships.filter((s) => s.verification === "verified").length, by_window: schByWindow },
  national_rules: rules.length,
  sources: { records: all.length, with_checked_source_link: all.filter(checked).length, pct_with_checked_source_link: pct(all.filter(checked).length, all.length),
    with_official_source: all.filter(official).length, pct_with_official_source: pct(all.filter(official).length, all.length) },
  revisions: { total: revisions.length, field_changes: corrections.length, records_added: added.length, records_removed: removed.length, by_kind: byKind },
  validation: { errors: v.errors.length, warnings: v.warnings.length },
};
writeFileSync(join(ROOT, "src/lib/data/coverage.json"), JSON.stringify(coverage, null, 1) + "\n");

const esc = (x) => String(x ?? "—").replace(/\|/g, "\\|").replace(/\n/g, " ");
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
const srcCell = (r) => (r.sources ?? []).slice(0, 2).map((s) => `[${host(s.url)}](${encodeURI(decodeURI(s.url))})`).join(", ") || "none";
const byUni = Object.fromEntries(universities.map((u) => [u.id, u]));
const status = (p) => {
  if ((p.conflicts ?? []).length) return "contradictory (value withheld)";
  const miss = [p.tuition_jod_per_credit_hour == null && "fee", p.credit_hours == null && "credit hours", p.min_admission_avg == null && "minimum"].filter(Boolean);
  const dated = p.tuition_year ? (yearOf(p.tuition_year) < 2025 ? `outdated (${p.tuition_year})` : p.tuition_year) : p.tuition_jod_per_credit_hour != null ? "year not stated" : "";
  return [miss.length ? `missing: ${miss.join(", ")}` : "complete", dated].filter(Boolean).join("; ");
};

const L = [];
L.push(`# Data audit tables (generated ${TODAY})`, "", "Generated by `npm run audit:data` from `data/verified/*.json`. Do not edit by hand. Narrative, method and limitations: [09-data-accuracy-audit.md](09-data-accuracy-audit.md).", "");
L.push("## Coverage (measured)", "", "```json", JSON.stringify(coverage, null, 1), "```", "");
L.push("## Programs", "", "Fee = JOD per credit hour on the stated track. Minimum = published minimum average to apply (not a competitive cut-off). A newer national rule can raise the minimum (see below).", "");
L.push("| Program | University | Credit hours | Fee (track) | Fee year | Minimum (year) | Past cut-offs | Status | Verification | Sources |", "|---|---|---|---|---|---|---|---|---|---|");
for (const p of programs) {
  const cuts = (p.historical_thresholds ?? []).filter((t) => t.kind === "competitive-cutoff").map((t) => `${t.value} (${t.year})`).join(", ");
  L.push(`| ${esc(p.name_en)} | ${esc(byUni[p.university_id]?.name_en)} | ${esc(p.credit_hours)} | ${p.tuition_jod_per_credit_hour != null ? `${p.tuition_jod_per_credit_hour} (${esc(p.tuition_track)})` : "—"} | ${esc(p.tuition_year)} | ${p.min_admission_avg != null ? `${p.min_admission_avg} (${esc(p.min_admission_year ?? "year not stated")})` : "—"} | ${esc(cuts || "—")} | ${esc(status(p))} | ${p.verification} | ${srcCell(p)} |`);
}
L.push("", "## National admission rules", "", "| Rule | Fields | Sector | Minimum | From | Source kind | Sources |", "|---|---|---|---|---|---|---|");
for (const r of rules) L.push(`| ${esc(r.text_en)} | ${r.fields.join(", ")} | ${r.sector} | ${r.min_avg} | ${r.from_year} | ${r.source_kind} | ${srcCell(r)} |`);
L.push("", "## Universities", "", "| University | Type | City | Programs in dataset | Extra mandatory fees | Verification | Sources |", "|---|---|---|---|---|---|---|");
for (const u of universities) L.push(`| ${esc(u.name_en)} (${esc(u.name_ar)}) | ${u.type} | ${esc(u.city)} | ${programs.filter((p) => p.university_id === u.id).length} | ${(u.additional_fees ?? []).map((f) => `${f.name} ${f.amount_jod}/${f.per}`).join("; ") || "—"} | ${u.verification} | ${srcCell(u)} |`);
L.push("", "## Scholarships and support", "", `Status re-checked against ${TODAY}: a stored "open" with a past closing date counts as closed.`, "");
L.push("| Opportunity | Provider | Stage | Status | Academic year | Window | Verification | Sources |", "|---|---|---|---|---|---|---|---|");
for (const s of scholarships) { const a = s.availability ?? {}; L.push(`| ${esc(s.name_en)} | ${esc(s.provider)} | ${esc(s.criteria?.stage)} | ${window(s)} | ${esc(a.academic_year)} | ${a.opens || a.closes ? `${esc(a.opens)} → ${esc(a.closes)}` : "—"} | ${s.verification} | ${srcCell(s)} |`); }
L.push("", `## Revision log (${revisions.length} entries)`, "", "Every change made to the seed data in the audit, from `data/verified/revisions.json`.", "");
L.push("| Dataset | Record | Field | Change | Old | New | Reason |", "|---|---|---|---|---|---|---|");
const short = (x) => { const s = typeof x === "string" ? x : JSON.stringify(x); return esc(s && s.length > 80 ? `${s.slice(0, 77)}…` : s); };
for (const r of revisions) L.push(`| ${r.dataset} | ${r.id} | ${r.field} | ${kindOf(r)} | ${short(r.old)} | ${short(r.new)} | ${esc(r.reason)} |`);
L.push("", `## Validation (${v.errors.length} errors, ${v.warnings.length} warnings)`, "");
for (const x of [...v.errors.map((e) => ({ ...e, level: "error" })), ...v.warnings.map((w) => ({ ...w, level: "warning" }))]) L.push(`- ${x.level}: ${x.dataset}/${x.id} ${x.check}: ${x.msg}`);
writeFileSync(join(ROOT, "docs/09-data-audit-tables.md"), L.join("\n") + "\n");
console.log(JSON.stringify(coverage, null, 1));

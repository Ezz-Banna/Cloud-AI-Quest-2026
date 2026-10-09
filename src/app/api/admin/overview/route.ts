import { NextResponse } from "next/server";
import { adminConfigured, isAdmin } from "@/lib/admin";
import { coverage, getAll, getEmployers, getRoles, readStore } from "@/lib/data/repo";
import { readAILog } from "@/lib/ai/log";
import type { DatasetName } from "@/lib/data/schemas";
import { programCompleteness, universityCompleteness } from "@/lib/data/record-completeness";
import type { Program, University } from "@/lib/types";

export const dynamic = "force-dynamic";
const STALE_DAYS = 180;
const KEY_FIELDS: Record<DatasetName, string[]> = {
  universities: ["city", "website"],
  programs: ["credit_hours", "tuition_jod_per_credit_hour", "min_admission_avg"],
  scholarships: ["eligibility_text", "url"],
  courses: ["url", "est_hours"],
};

export async function GET() {
  if (!adminConfigured()) return NextResponse.json({ configured: false }, { status: 503 });
  if (!(await isAdmin())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const now = Date.now();
  const issues: { dataset: string; id: string; issue: string }[] = [];
  const data: Record<string, unknown[]> = {};
  for (const name of Object.keys(KEY_FIELDS) as DatasetName[]) {
    const rows = getAll(name) as unknown as Record<string, unknown>[];
    data[name] = rows;
    for (const r of rows) {
      const id = String(r.id);
      const sources = (r.sources as { url: string; checked_at?: string }[]) ?? [];
      if (!sources.length) issues.push({ dataset: name, id, issue: "No source recorded" });
      for (const src of sources) {
        if (!src.checked_at) issues.push({ dataset: name, id, issue: `Source has no check date: ${src.url}` });
        else if ((now - Date.parse(src.checked_at)) / 86400000 > STALE_DAYS) issues.push({ dataset: name, id, issue: `Source older than ${STALE_DAYS} days (${src.checked_at})` });
      }
      const missing = KEY_FIELDS[name].filter((f) => r[f] == null || r[f] === "");
      if (missing.length) issues.push({ dataset: name, id, issue: `Missing: ${missing.join(", ")}` });
      if (r.verification === "verified" && missing.length) issues.push({ dataset: name, id, issue: "Marked verified but key fields are missing" });
      for (const c of (r.conflicts as { field: string; values: { value: unknown; layer: string; source?: string }[] }[] | undefined) ?? []) {
        issues.push({ dataset: name, id, issue: `Sources disagree on ${c.field}: ${c.values.map((v) => `${v.layer} ${String(v.value)}${v.source ? ` (${v.source})` : ""}`).join(" vs ")}. Excluded from scoring until resolved; save the correct value as an admin edit.` });
      }
      if (name === "programs" || name === "universities") {
        const c = name === "programs" ? programCompleteness(r as unknown as Program) : universityCompleteness(r as unknown as University);
        r.completeness = c.pct;
      }
    }
  }
  const store = readStore();
  return NextResponse.json({
    coverage: coverage(), issues, data,
    roles: getRoles().map((r) => ({ ...r, deletable: (store.roles ?? []).some((x) => x.id === r.id) })),
    employers: getEmployers(),
    candidates: (store.candidates ?? []).length,
    ai_log: readAILog().slice(-200).reverse(),
  });
}

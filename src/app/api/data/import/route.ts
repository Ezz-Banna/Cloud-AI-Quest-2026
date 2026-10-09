import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { parseBody } from "@/lib/api";
import { DATASETS, validateRecords } from "@/lib/data/schemas";
import { writeImported } from "@/lib/data/repo";
import { isAdmin } from "@/lib/admin";

// Sample-data import: validates every row, reports errors, stores only valid rows. Nothing is marked verified unless it has sources.
const Body = z.object({ dataset: z.enum(["universities", "programs", "scholarships", "courses"]), rows: z.array(z.unknown()).max(5000), dry_run: z.boolean().default(true) });
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Admin sign-in required" }, { status: 401 });
  const b = await parseBody(req, Body);
  if (!b.ok) return b.res;
  const { valid, errors } = validateRecords(DATASETS[b.data.dataset] as never, b.data.rows);
  const downgraded = (valid as { verification: string; sources: unknown[] }[]).map((r) =>
    r.verification === "verified" && (!r.sources || r.sources.length === 0) ? { ...r, verification: "unverified" } : r);
  if (!b.data.dry_run) writeImported(b.data.dataset, downgraded);
  return NextResponse.json({ dataset: b.data.dataset, valid: downgraded.length, invalid: errors.length, errors: errors.slice(0, 50), saved: !b.data.dry_run });
}

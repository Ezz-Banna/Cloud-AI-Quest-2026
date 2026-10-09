import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { parseBody } from "@/lib/api";
import { isAdmin } from "@/lib/admin";
import { DATASETS } from "@/lib/data/schemas";
import { readOverrides, writeOverrides } from "@/lib/data/repo";

const Dataset = z.enum(["universities", "programs", "scholarships", "courses"]);

// Create or update one record. Saved as an override on top of the seed file, so the original stays auditable.
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const b = await parseBody(req, z.object({ dataset: Dataset, record: z.record(z.string(), z.unknown()) }));
  if (!b.ok) return b.res;
  const parsed = DATASETS[b.data.dataset].safeParse(b.data.record);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 400 });
  const rec = parsed.data as { id: string; verification: string; sources: { checked_at?: string | null }[] };
  // Provenance rule: "verified" needs at least one source with a check date.
  if (rec.verification === "verified" && !rec.sources.some((s) => s.checked_at)) rec.verification = "unverified";
  const rows = readOverrides(b.data.dataset).filter((r) => r.id !== rec.id);
  writeOverrides(b.data.dataset, [...rows, rec]);
  return NextResponse.json({ saved: rec });
}

// Remove an admin override (restores the seed or imported version, if any).
export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const u = new URL(req.url);
  const ds = Dataset.safeParse(u.searchParams.get("dataset"));
  const id = u.searchParams.get("id");
  if (!ds.success || !id) return NextResponse.json({ error: "dataset and id are required" }, { status: 400 });
  const rows = readOverrides(ds.data);
  writeOverrides(ds.data, rows.filter((r) => r.id !== id));
  return NextResponse.json({ removed: rows.length - rows.filter((r) => r.id !== id).length });
}

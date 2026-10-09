import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { parseBody } from "@/lib/api";
import { isAdmin } from "@/lib/admin";
import { readStore, updateStore } from "@/lib/data/repo";
import { expired, REVIEW_RUBRIC } from "@/lib/reviews";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const reviews = (readStore().reviews ?? []).filter((r) => !expired(r))
    .map(({ token_hash: _t, ...r }) => r)
    .sort((a, b) => Number(!!a.decision) - Number(!!b.decision) || a.requested_at.localeCompare(b.requested_at));
  return NextResponse.json({ rubric: REVIEW_RUBRIC, reviews });
}

// A reviewer records a decision against the stated rubric, with a reason the person will see.
// "reviewed" needs every criterion met; anything else is "needs-clarification" with a reason.
const Decide = z.object({
  id: z.string().max(80),
  rubric: z.array(z.object({ criterion: z.enum(REVIEW_RUBRIC.map((c) => c.id) as [string, ...string[]]), met: z.boolean() })).length(REVIEW_RUBRIC.length),
  reason: z.string().min(10).max(600),
  reviewer: z.string().min(2).max(60),
}).strict();

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const b = await parseBody(req, Decide);
  if (!b.ok) return b.res;
  if (new Set(b.data.rubric.map((r) => r.criterion)).size !== REVIEW_RUBRIC.length) return NextResponse.json({ error: "Answer each rubric criterion once" }, { status: 400 });
  if (!(readStore().reviews ?? []).some((r) => r.id === b.data.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const decision = b.data.rubric.every((r) => r.met) ? "reviewed" as const : "needs-clarification" as const;
  const decided_at = new Date().toISOString();
  const ok = updateStore((s) => {
    const r = (s.reviews ?? []).find((x) => x.id === b.data.id);
    if (r) Object.assign(r, { decision, reason: b.data.reason, rubric: b.data.rubric, reviewer: `${b.data.reviewer} (Bridgecom team, demo)`, decided_at });
  });
  if (!ok) return NextResponse.json({ error: "Could not save the decision." }, { status: 503 });
  return NextResponse.json({ id: b.data.id, decision, decided_at });
}

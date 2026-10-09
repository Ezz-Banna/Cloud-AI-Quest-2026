import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { parseBody } from "@/lib/api";
import { readStore, updateStore } from "@/lib/data/repo";
import { SKILL_BY_ID } from "@/lib/data/taxonomy";
import { isHttpUrl } from "@/lib/profile-ops";
import { expired } from "@/lib/reviews";
import { bearer, hashToken, newId, newToken, tokenMatches } from "@/lib/tokens";

export const dynamic = "force-dynamic";

// A person asks for one skill's attached work to be reviewed. Only that skill's links and short notes are sent.
const Create = z.object({
  skill_id: z.string().max(60),
  level: z.number().int().min(1).max(3),
  evidence: z.array(z.object({ kind: z.enum(["link", "quote"]), value: z.string().max(500) })).min(1).max(5),
}).strict();

const MAX_OPEN = 500;

export async function POST(req: Request) {
  const b = await parseBody(req, Create);
  if (!b.ok) return b.res;
  if (!SKILL_BY_ID[b.data.skill_id]) return NextResponse.json({ error: "Unknown skill" }, { status: 400 });
  if (!b.data.evidence.some((e) => e.kind === "link" && isHttpUrl(e.value))) return NextResponse.json({ error: "Attach at least one http(s) link to the work first" }, { status: 400 });
  const open = (readStore().reviews ?? []).filter((r) => !r.decision).length;
  if (open >= MAX_OPEN) return NextResponse.json({ error: "The review queue is full. Please try again later." }, { status: 503 });
  const id = newId("rev");
  const token = newToken();
  const requested_at = new Date().toISOString();
  const ok = updateStore((s) => {
    s.reviews = [...(s.reviews ?? []).filter((r) => !expired(r)), { id, token_hash: hashToken(token), ...b.data, requested_at }];
  });
  if (!ok) return NextResponse.json({ error: "Could not save the request. It was not sent." }, { status: 503 });
  return NextResponse.json({ id, token, requested_at });
}

/** The requester reads their own request's decision. */
export function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const r = (readStore().reviews ?? []).find((x) => x.id === id);
  if (!r || expired(r) || !tokenMatches(bearer(req), r.token_hash)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ id: r.id, skill_id: r.skill_id, requested_at: r.requested_at, decision: r.decision ?? null, reason: r.reason ?? null, rubric: r.rubric ?? null, reviewer: r.reviewer ?? null, decided_at: r.decided_at ?? null });
}

/** The requester withdraws the request; the copied links are deleted. */
export function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const r = (readStore().reviews ?? []).find((x) => x.id === id);
  if (!r || !tokenMatches(bearer(req), r.token_hash)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ok = updateStore((s) => { s.reviews = (s.reviews ?? []).filter((x) => x.id !== id); });
  if (!ok) return NextResponse.json({ error: "Could not withdraw. Please try again." }, { status: 503 });
  return NextResponse.json({ withdrawn: true });
}

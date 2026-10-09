// Browser-side helpers for asking a person to review attached work. Only one skill's links and quotes are sent.
import type { LearnerProfile, ProfileSkill } from "./types";
import { isHttpUrl } from "./profile-ops";

export function canRequestReview(s: ProfileSkill) {
  return s.level > 0 && (!s.review || !!s.review.decision) && (s.status === "evidence-attached" || s.status === "needs-clarification") && s.evidence.some((e) => e.kind === "link" && isHttpUrl(e.value));
}

export async function requestReview(s: ProfileSkill): Promise<{ ok: true; skill: ProfileSkill } | { ok: false; error: string }> {
  const evidence = s.evidence.filter((e) => (e.kind === "link" && isHttpUrl(e.value)) || e.kind === "quote").slice(0, 5).map((e) => ({ kind: e.kind as "link" | "quote", value: e.value.slice(0, 500) }));
  try {
    const r = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skill_id: s.skill_id, level: s.level, evidence }) });
    const d = await r.json();
    if (!r.ok) return { ok: false, error: d.error ?? `Error ${r.status}` };
    return { ok: true, skill: { ...s, status: "awaiting-review", review: { id: d.id, token: d.token, requested_at: d.requested_at } } };
  } catch { return { ok: false, error: "Network error" }; }
}

export async function withdrawReview(s: ProfileSkill): Promise<ProfileSkill> {
  if (s.review) await fetch(`/api/reviews?id=${encodeURIComponent(s.review.id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${s.review.token}` } }).catch(() => {});
  return { ...s, status: s.evidence.some((e) => e.kind === "link") ? "evidence-attached" : "self-reported", review: undefined };
}

export function replaceSkill(p: LearnerProfile, s: ProfileSkill): LearnerProfile {
  return { ...p, skills: p.skills.map((x) => (x.skill_id === s.skill_id ? s : x)) };
}

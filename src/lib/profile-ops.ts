// Pure helpers to update the learner profile. Never raise a skill's evidence status beyond what was supplied.
import type { EvidenceStatus, LearnerProfile, Level, ProfileSkill } from "./types";

const RANK: Record<EvidenceStatus, number> = { "self-reported": 0, "needs-clarification": 1, "evidence-attached": 1, "awaiting-review": 2, "reviewed": 3 };

export function mergeSkill(p: LearnerProfile, add: ProfileSkill): LearnerProfile {
  const ex = p.skills.find((s) => s.skill_id === add.skill_id);
  if (!ex) return { ...p, skills: [...p.skills, add] };
  const merged: ProfileSkill = {
    skill_id: ex.skill_id,
    level: Math.max(ex.level, add.level) as Level,
    // new work after a "needs clarification" decision goes back to "evidence attached" (not reviewed yet)
    status: ex.status === "needs-clarification" && add.status === "evidence-attached" ? "evidence-attached" : RANK[add.status] > RANK[ex.status] ? add.status : ex.status,
    evidence: [...ex.evidence, ...add.evidence.filter((e) => !ex.evidence.some((x) => x.kind === e.kind && x.value === e.value))],
    review: ex.review,
  };
  return { ...p, skills: p.skills.map((s) => (s.skill_id === add.skill_id ? merged : s)) };
}

export function attachEvidence(p: LearnerProfile, skillId: string, url: string): LearnerProfile {
  return mergeSkill(p, { skill_id: skillId, level: 0, status: "evidence-attached", evidence: [{ kind: "link", value: url }] });
}

/** Only plain web links are accepted as evidence (no javascript:, data:, file: or credentials in the URL). */
export function isHttpUrl(s: string) {
  try { const u = new URL(s.trim()); return (u.protocol === "http:" || u.protocol === "https:") && !u.username && !u.password && s.length <= 500; } catch { return false; }
}

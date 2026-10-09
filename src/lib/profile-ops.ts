// Pure helpers to update the learner profile. Never raise a skill's evidence status beyond what was supplied.
import type { EvidenceStatus, LearnerProfile, Level, ProfileSkill } from "./types";

const RANK: Record<EvidenceStatus, number> = { "self-reported": 0, "evidence-attached": 1, "practical-assessed": 2, "issuer-verified": 3 };

export function mergeSkill(p: LearnerProfile, add: ProfileSkill): LearnerProfile {
  const ex = p.skills.find((s) => s.skill_id === add.skill_id);
  if (!ex) return { ...p, skills: [...p.skills, add] };
  const merged: ProfileSkill = {
    skill_id: ex.skill_id,
    level: Math.max(ex.level, add.level) as Level,
    status: RANK[add.status] > RANK[ex.status] ? add.status : ex.status,
    evidence: [...ex.evidence, ...add.evidence.filter((e) => !ex.evidence.some((x) => x.kind === e.kind && x.value === e.value))],
  };
  return { ...p, skills: p.skills.map((s) => (s.skill_id === add.skill_id ? merged : s)) };
}

export function attachEvidence(p: LearnerProfile, skillId: string, url: string): LearnerProfile {
  return mergeSkill(p, { skill_id: skillId, level: 0, status: "evidence-attached", evidence: [{ kind: "link", value: url }] });
}

export function isHttpUrl(s: string) {
  try { const u = new URL(s); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; }
}

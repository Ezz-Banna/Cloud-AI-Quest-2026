// Human review of attached work: a minimal, honest workflow. In this demo the reviewer is a member of the
// Bridgecom team signed in as admin; there is no external assessor network. See docs/governance.md.
export const REVIEW_RUBRIC = [
  { id: "reachable", en: "The link opens and the work can be seen without signing in", ar: "الرابط يعمل ويمكن رؤية العمل دون تسجيل دخول" },
  { id: "own-part", en: "The person's own part of the work can be identified", ar: "يمكن تمييز الجزء الذي أنجزه الشخص بنفسه" },
  { id: "skill-shown", en: "The work uses this skill in a meaningful way", ar: "العمل يستخدم هذه المهارة استخداماً فعلياً" },
  { id: "level-shown", en: "The work matches the level the person recorded", ar: "العمل يوافق المستوى الذي سجّله الشخص" },
] as const;

/** Requests are deleted this many days after a decision, or after being requested if never decided. */
export const RETENTION_DAYS = { decided: 30, open: 60 };

export function expired(r: { requested_at: string; decided_at?: string }, now = Date.now()) {
  const day = 86_400_000;
  return r.decided_at ? now - Date.parse(r.decided_at) > RETENTION_DAYS.decided * day : now - Date.parse(r.requested_at) > RETENTION_DAYS.open * day;
}

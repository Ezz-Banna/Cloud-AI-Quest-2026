"use client";
// Learner profile lives on the user's device (localStorage). Nothing is sent to employers unless they opt in.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { emptyProfile, normaliseEvidenceStatus, type EmployerRole, type LearnerProfile } from "@/lib/types";
import type { Lang } from "@/lib/i18n";

const KEY = "bridgecom.profile.v1";
const PROGRESS = "bridgecom.progress.v1";

export interface Progress {
  discover_done: boolean;
  empower_done: boolean;
  /** Per-role shares the person made, with the private token that withdraws them. Sharing is off by default. */
  shares?: Record<string, { id: string; token: string; at: string }>;
  /** Manage tokens for roles this device created in the employer portal. */
  role_tokens?: Record<string, string>;
  /** Interface activity only. These record what the person did on this device, never an outcome. */
  activity: { kind: "role-compared" | "programs-saved" | "evidence-submitted" | "review-requested" | "next-task-selected" | "requirements-confirmed"; ref?: string; at: string }[];
  selected_role?: string;
  /** A pasted posting with the requirements the person confirmed, kept so a refresh does not lose it. */
  pasted_role?: EmployerRole;
  /** The task the person chose to work on next. */
  next_task?: { role_id: string; skill_id: string; at: string };
}

interface Ctx {
  profile: LearnerProfile;
  setProfile: (u: LearnerProfile | ((p: LearnerProfile) => LearnerProfile)) => void;
  progress: Progress;
  setProgress: (u: (p: Progress) => Progress) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  tr: (en: string, ar: string) => string;
  hydrated: boolean;
  /** false when the browser refused to save (private mode, storage full or blocked). */
  storageOk: boolean;
  logActivity: (kind: Progress["activity"][number]["kind"], ref?: string) => void;
  reset: () => void;
  loadDemo: (p: LearnerProfile) => void;
}

const C = createContext<Ctx | null>(null);
const emptyProgress = (): Progress => ({ discover_done: false, empower_done: false, activity: [] });

function read<T>(k: string): T | null {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
function write(k: string, v: unknown): boolean {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setP] = useState<LearnerProfile>(emptyProfile);
  const [progress, setPr] = useState<Progress>(emptyProgress);
  const [hydrated, setHydrated] = useState(false);
  const [storageOk, setStorageOk] = useState(true);

  useEffect(() => {
    const p = read<LearnerProfile>(KEY);
    const pr = read<Progress & { readiness_history?: unknown; candidate_id?: unknown }>(PROGRESS);
    if (p) setP({ ...emptyProfile(), ...p, skills: (p.skills ?? []).map((s) => ({ ...s, status: normaliseEvidenceStatus(s.status) })) });
    if (pr) { const { readiness_history: _old, candidate_id: _cid, ...rest } = pr; void _old; void _cid; setPr({ ...emptyProgress(), ...rest, activity: rest.activity ?? [] }); }
    setStorageOk(write("bridgecom.probe", 1));
    setHydrated(true);
  }, []);

  // Picks up reviewer decisions for this device's open review requests (once per visit).
  useEffect(() => {
    if (!hydrated) return;
    const open = profile.skills.filter((sk) => sk.review && !sk.review.decision);
    if (!open.length) return;
    let cancelled = false;
    Promise.all(open.map((sk) => fetch(`/api/reviews?id=${encodeURIComponent(sk.review!.id)}`, { headers: { Authorization: `Bearer ${sk.review!.token}` } })
      .then((r) => (r.ok ? r.json() : r.status === 404 ? { gone: true } : null)).then((d) => ({ skill_id: sk.skill_id, d })).catch(() => null)))
      .then((rows) => {
        if (cancelled) return;
        const done = rows.filter((x): x is { skill_id: string; d: Record<string, unknown> } => !!x && !!x.d && (!!x.d.decision || !!x.d.gone));
        if (!done.length) return;
        setProfile((p) => ({ ...p, skills: p.skills.map((sk) => {
          const hit = done.find((x) => x.skill_id === sk.skill_id);
          if (!hit || !sk.review) return sk;
          if (hit.d.gone) return { ...sk, status: "evidence-attached", review: undefined }; // expired or withdrawn
          const d = hit.d as { decision: "reviewed" | "needs-clarification"; reason: string; rubric: { criterion: string; met: boolean }[]; reviewer: string; decided_at: string };
          return { ...sk, status: d.decision, review: { ...sk.review, decision: d.decision, reason: d.reason, rubric: d.rubric, reviewer: d.reviewer, decided_at: d.decided_at } };
        }) }));
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    document.documentElement.lang = profile.language;
    document.documentElement.dir = profile.language === "ar" ? "rtl" : "ltr";
  }, [profile.language]);

  const setProfile: Ctx["setProfile"] = useCallback((u) => {
    setP((prev) => {
      const next = typeof u === "function" ? u(prev) : u;
      const stamped = { ...next, updated_at: new Date().toISOString() };
      setStorageOk(write(KEY, stamped));
      return stamped;
    });
  }, []);
  const setProgress: Ctx["setProgress"] = useCallback((u) => {
    setPr((prev) => { const n = u(prev); setStorageOk(write(PROGRESS, n)); return n; });
  }, []);
  const logActivity: Ctx["logActivity"] = useCallback((kind, ref) => {
    setProgress((p) => {
      const last = p.activity[p.activity.length - 1];
      if (last && last.kind === kind && last.ref === ref) return p;
      return { ...p, activity: [...p.activity, { kind, ref, at: new Date().toISOString() }].slice(-100) };
    });
  }, [setProgress]);

  // Stable per language, so effects that depend on tr do not re-run on every profile or progress change.
  const tr = useCallback((en: string, ar: string) => (profile.language === "ar" ? ar : en), [profile.language]);

  const value = useMemo<Ctx>(() => ({
    profile, setProfile, progress, setProgress, hydrated, storageOk, logActivity,
    lang: profile.language,
    setLang: (l) => setProfile((p) => ({ ...p, language: l })),
    tr,
    reset: () => { const p = { ...emptyProfile(), language: profile.language }; setProfile(p); setProgress(() => emptyProgress()); },
    loadDemo: (p) => { setProfile(p); setProgress((pr) => ({ ...pr, discover_done: true })); },
  }), [profile, progress, hydrated, storageOk, setProfile, setProgress, logActivity, tr]);

  return (
    <C.Provider value={value}>
      {children}
      {hydrated && !storageOk && <StorageWarning profile={profile} lang={profile.language} />}
    </C.Provider>
  );
}

/** Shown when the browser will not save. Changes stay only until the tab closes; the person can download a copy. */
function StorageWarning({ profile, lang }: { profile: LearnerProfile; lang: Lang }) {
  const ar = lang === "ar";
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "bridgecom-profile.json"; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div role="alert" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl bg-bad-100 p-4 text-sm text-bad shadow-lg">
      <p className="font-semibold">{ar ? "لم نتمكن من الحفظ على هذا الجهاز." : "Your answers could not be saved on this device."}</p>
      <p className="mt-1">{ar ? "قد يكون المتصفح في الوضع الخاص أو مساحة التخزين ممتلئة. ستبقى إجاباتك حتى تغلق هذه الصفحة فقط." : "The browser may be in private mode or out of storage. Your answers stay only until you close this tab."}</p>
      <button type="button" onClick={download} className="mt-2 font-semibold underline underline-offset-2">{ar ? "نزّل نسخة من ملفك" : "Download a copy of your profile"}</button>
    </div>
  );
}

export function useBridge() {
  const c = useContext(C);
  if (!c) throw new Error("useBridge must be used inside ProfileProvider");
  return c;
}

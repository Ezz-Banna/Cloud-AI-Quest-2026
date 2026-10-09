"use client";
// Learner profile lives on the user's device (localStorage). Nothing is sent to employers unless they opt in.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { emptyProfile, type LearnerProfile } from "@/lib/types";
import type { Lang } from "@/lib/i18n";

const KEY = "bridgecom.profile.v1";
const PROGRESS = "bridgecom.progress.v1";

export interface Progress {
  discover_done: boolean;
  empower_done: boolean;
  candidate_id: string;
  readiness_history: { role_id: string; pct: number; at: string }[];
  selected_role?: string;
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
  reset: () => void;
  loadDemo: (p: LearnerProfile) => void;
}

const C = createContext<Ctx | null>(null);
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `c-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const emptyProgress = (): Progress => ({ discover_done: false, empower_done: false, candidate_id: newId(), readiness_history: [] });

function read<T>(k: string): T | null {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
function write(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable: keep in memory */ }
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setP] = useState<LearnerProfile>(emptyProfile);
  const [progress, setPr] = useState<Progress>(emptyProgress);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const p = read<LearnerProfile>(KEY);
    const pr = read<Progress>(PROGRESS);
    if (p) setP({ ...emptyProfile(), ...p });
    if (pr) setPr({ ...emptyProgress(), ...pr });
    setHydrated(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = profile.language;
    document.documentElement.dir = profile.language === "ar" ? "rtl" : "ltr";
  }, [profile.language]);

  const setProfile: Ctx["setProfile"] = useCallback((u) => {
    setP((prev) => {
      const next = typeof u === "function" ? u(prev) : u;
      const stamped = { ...next, updated_at: new Date().toISOString() };
      write(KEY, stamped);
      return stamped;
    });
  }, []);
  const setProgress: Ctx["setProgress"] = useCallback((u) => {
    setPr((prev) => { const n = u(prev); write(PROGRESS, n); return n; });
  }, []);

  const value = useMemo<Ctx>(() => ({
    profile, setProfile, progress, setProgress, hydrated,
    lang: profile.language,
    setLang: (l) => setProfile((p) => ({ ...p, language: l })),
    tr: (en, ar) => (profile.language === "ar" ? ar : en),
    reset: () => { const p = { ...emptyProfile(), language: profile.language }; setProfile(p); setProgress(() => emptyProgress()); },
    loadDemo: (p) => { setProfile(p); setProgress((pr) => ({ ...pr, discover_done: true })); },
  }), [profile, progress, hydrated, setProfile, setProgress]);

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useBridge() {
  const c = useContext(C);
  if (!c) throw new Error("useBridge must be used inside ProfileProvider");
  return c;
}

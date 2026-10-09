"use client";
import { AnalysisMode } from "@/components/Badges";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useBridge } from "@/components/ProfileProvider";
import { OnboardingForm } from "@/components/OnboardingForm";
import { ChatOnboarding } from "@/components/ChatOnboarding";
import { DEMO_PROFILE } from "@/lib/demo";
import type { LearnerProfile } from "@/lib/types";

export default function Discover() {
  const { tr, lang, setProfile, loadDemo, hydrated } = useBridge();
  const router = useRouter();
  const [mode, setMode] = useState<"form" | "chat">("form");
  const done = (p: LearnerProfile) => { setProfile(p); router.push("/discover/results"); };
  const startDemo = () => { loadDemo({ ...DEMO_PROFILE, language: lang }); router.push("/discover/results"); };

  // /discover?demo=1 (the homepage's "Explore an example") loads the synthetic demo student, exactly like the button below.
  // Waits for the stored profile to load so the visitor's chosen language is kept.
  const demoStarted = useRef(false);
  const [demoRequested, setDemoRequested] = useState(false);
  useEffect(() => { setDemoRequested(new URLSearchParams(window.location.search).get("demo") === "1"); }, []);
  useEffect(() => {
    if (!demoRequested || !hydrated || demoStarted.current) return;
    demoStarted.current = true;
    loadDemo({ ...DEMO_PROFILE, language: lang });
    router.replace("/discover/results");
  }, [demoRequested, hydrated, lang, loadDemo, router]);

  return (
    <div className="mx-auto max-w-3xl">
      {demoRequested && <p role="status" className="mb-4 rounded-xl bg-sand-100 px-4 py-3 text-sm text-ink">{tr("Loading the synthetic demo student…", "جارٍ تحميل الطالبة التجريبية المصطنعة…")}</p>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h1">{tr("Let's find programs that fit you", "لنجد البرامج التي تناسبك")}</h1>
        </div>
        <button type="button" className="btn-ghost text-sm" onClick={startDemo}>
          {tr("Use the synthetic demo student", "استخدم الطالبة التجريبية")}
        </button>
      </div>
      <div className="mt-6 inline-flex rounded-full bg-mist p-1" role="tablist" aria-label={tr("How would you like to answer?", "كيف تحب أن تجيب؟")}>
        {([["form", tr("Step-by-step form", "استبيان خطوة بخطوة")], ["chat", tr("Conversation", "محادثة")]] as const).map(([m, label]) => (
          <button key={m} role="tab" aria-selected={mode === m} type="button" onClick={() => setMode(m)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === m ? "bg-white text-teal shadow" : "text-muted"}`}>{label}</button>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">{mode === "form"
        ? tr("Eight short steps. Every answer can be changed later.", "ثماني خطوات قصيرة. يمكنك تغيير أي إجابة لاحقاً.")
        : tr("Answer in your own words. You check the profile before it's used.", "أجب بكلماتك. تراجع الملف قبل استخدامه.")}</p>
        <div className="mt-2"><AnalysisMode /></div>
      <div className="mt-4">{mode === "form" ? <OnboardingForm onDone={done} /> : <ChatOnboarding onDone={done} />}</div>
    </div>
  );
}

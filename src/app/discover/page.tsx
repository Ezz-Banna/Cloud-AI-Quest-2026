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
      {demoRequested && <p role="status" className="mb-4 rounded-xl bg-sand-100 px-4 py-3 text-sm text-ink">{tr("Loading Lina’s example…", "عم نجهّز مثال لينا…")}</p>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h1">{tr("Let's find options that fit you", "خلّينا نلاقي خيارات بتناسبك.")}</h1>
          <p className="mt-2 text-muted">{tr("Start with your interests, average and budget.", "ابدأ باهتماماتك، معدّلك، وميزانيتك.")}</p>
        </div>
        <button type="button" className="btn-ghost text-sm" onClick={startDemo}>
          {tr("Try Lina’s example (made-up student)", "جرّب مثال لينا (طالبة افتراضية)")}
        </button>
      </div>
      <div className="mt-6 inline-flex rounded-full bg-mist p-1" role="tablist" aria-label={tr("How would you like to answer?", "كيف تحب أن تجيب؟")}>
        {([["form", tr("Quick questions", "أسئلة سريعة")], ["chat", tr("Chat", "دردشة")]] as const).map(([m, label]) => (
          <button key={m} role="tab" aria-selected={mode === m} type="button" onClick={() => setMode(m)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === m ? "bg-white text-teal shadow" : "text-muted"}`}>{label}</button>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">{mode === "form"
        ? tr("8 quick steps. You can change any answer later.", "8 خطوات سريعة، وبتقدر تغيّر أي جواب بعدين.")
        : tr("Answer in your own words. You check the summary before it’s used.", "جاوب بكلامك، وبتراجع الملخص قبل ما نستخدمه.")}</p>
        <div className="mt-2"><AnalysisMode /></div>
      <div className="mt-4">{mode === "form" ? <OnboardingForm onDone={done} /> : <ChatOnboarding onDone={done} />}</div>
    </div>
  );
}

"use client";
import { AnalysisMode } from "@/components/Badges";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useBridge } from "@/components/ProfileProvider";
import { OnboardingForm } from "@/components/OnboardingForm";
import { DEMO_PROFILE } from "@/lib/demo";
import type { LearnerProfile } from "@/lib/types";

export default function Discover() {
  const { tr, lang, setProfile, loadDemo, hydrated } = useBridge();
  const router = useRouter();
  const done = (p: LearnerProfile) => { setProfile(p); router.push("/discover/results"); };
  // The example fills in the questionnaire with Lina's answers; the presenter steps through it and can change anything.
  const [formKey, setFormKey] = useState(0);
  const [demoFilled, setDemoFilled] = useState(false);
  const fillDemo = () => { loadDemo({ ...DEMO_PROFILE, language: lang }); setFormKey((k) => k + 1); setDemoFilled(true); };
  const startDemo = fillDemo;

  // /discover?demo=1 (the homepage's "Explore an example") loads the synthetic demo student, exactly like the button below.
  // Waits for the stored profile to load so the visitor's chosen language is kept.
  const demoStarted = useRef(false);
  const [demoRequested, setDemoRequested] = useState(false);
  useEffect(() => { setDemoRequested(new URLSearchParams(window.location.search).get("demo") === "1"); }, []);
  useEffect(() => {
    if (!demoRequested || !hydrated || demoStarted.current) return;
    demoStarted.current = true;
    fillDemo();
    router.replace("/discover");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoRequested, hydrated, lang, loadDemo, router]);

  return (
    <div className="mx-auto max-w-3xl">
      {demoRequested && !demoFilled && <p role="status" className="mb-4 rounded-xl bg-sand-100 px-4 py-3 text-sm text-ink">{tr("Loading Lina’s example…", "عم نجهّز مثال لينا…")}</p>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h1">{tr("Let's find options that fit you", "خلّينا نلاقي خيارات بتناسبك.")}</h1>
          <p className="mt-2 text-muted">{tr("Start with your interests, average and budget.", "ابدأ باهتماماتك، معدّلك، وميزانيتك.")}</p>
        </div>
        <button type="button" className="btn-ghost text-sm" onClick={startDemo}>
          {tr("Try Lina’s example (made-up student)", "جرّب مثال لينا (طالبة افتراضية)")}
        </button>
      </div>
      <p className="mt-6 text-sm text-muted">{tr("8 quick steps. You can change any answer later.", "8 خطوات سريعة، وبتقدر تغيّر أي جواب بعدين.")}</p>
      <div className="mt-2"><AnalysisMode /></div>
      {demoFilled && (
        <p role="status" className="mt-4 rounded-xl border border-sand bg-sand-100 px-4 py-3 text-sm text-ink">
          <strong>{tr("Lina’s answers are filled in.", "إجابات لينا معبّاة.")}</strong> {tr("She is a made-up student. Press Continue through the 8 steps, change any answer, then see her results.", "لينا طالبة افتراضية. اضغط «التالي» عبر الخطوات الثماني، غيّر أي إجابة، ثم شوف نتائجها.")}
        </p>
      )}
      <div className="mt-4"><OnboardingForm key={formKey} onDone={done} /></div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBridge } from "@/components/ProfileProvider";
import { OnboardingForm } from "@/components/OnboardingForm";
import { ChatOnboarding } from "@/components/ChatOnboarding";
import { DEMO_PROFILE } from "@/lib/demo";
import type { LearnerProfile } from "@/lib/types";

export default function Discover() {
  const { tr, lang, setProfile, loadDemo } = useBridge();
  const router = useRouter();
  const [mode, setMode] = useState<"form" | "chat">("form");
  const done = (p: LearnerProfile) => { setProfile(p); router.push("/discover/results"); };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{tr("Stage 1 · Discover", "المرحلة 1 · اكتشف")}</p>
          <h1 className="h1 mt-2">{tr("Let's find programs that fit you", "لنجد البرامج التي تناسبك")}</h1>
        </div>
        <button type="button" className="btn-ghost text-sm" onClick={() => { loadDemo({ ...DEMO_PROFILE, language: lang }); router.push("/discover/results"); }}>
          {tr("Use the synthetic demo student", "استخدم الطالبة التجريبية")}
        </button>
      </div>
      <div className="mt-6 inline-flex rounded-full bg-mist p-1" role="tablist" aria-label={tr("How would you like to answer?", "كيف تحب أن تجيب؟")}>
        {([["form", tr("Step-by-step form", "استبيان خطوة بخطوة")], ["chat", tr("Chat with AI", "محادثة مع الذكاء الاصطناعي")]] as const).map(([m, label]) => (
          <button key={m} role="tab" aria-selected={mode === m} type="button" onClick={() => setMode(m)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === m ? "bg-white text-teal shadow" : "text-muted"}`}>{label}</button>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">{mode === "form"
        ? tr("Eight short steps. Every answer can be changed later.", "ثماني خطوات قصيرة. يمكنك تغيير أي إجابة لاحقاً.")
        : tr("Answer in your own words, in Arabic or English. AI turns your answers into a profile that you check before we use it.", "أجب بكلماتك بالعربية أو الإنجليزية. يحوّل الذكاء الاصطناعي إجاباتك إلى ملف تتحقق منه قبل استخدامه.")}</p>
      <div className="mt-4">{mode === "form" ? <OnboardingForm onDone={done} /> : <ChatOnboarding onDone={done} />}</div>
    </div>
  );
}

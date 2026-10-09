"use client";
// Step-by-step onboarding questionnaire with progressive disclosure, validation and a visible progress bar.
import { useState } from "react";
import { useBridge } from "./ProfileProvider";
import { CITIES, FIELDS } from "@/lib/data/taxonomy";
import type { Achievement, EducationLevel, LearnerProfile, Priority, Stream } from "@/lib/types";

type Opt<T extends string = string> = { v: T; en: string; ar: string };
const EDU: Opt<EducationLevel>[] = [
  { v: "grade-12", en: "In Grade 12 (Tawjihi year)", ar: "في الصف الثاني عشر (سنة التوجيهي)" },
  { v: "tawjihi-graduate", en: "Finished Tawjihi / equivalent", ar: "أنهيت التوجيهي أو ما يعادله" },
  { v: "university-student", en: "University student", ar: "طالب جامعي" },
  { v: "graduate", en: "Graduate", ar: "خريج" },
  { v: "other", en: "Other", ar: "أخرى" },
];
const STREAMS: Opt<Stream>[] = [
  { v: "scientific", en: "Scientific", ar: "علمي" }, { v: "literary", en: "Literary", ar: "أدبي" }, { v: "it", en: "IT", ar: "تكنولوجيا المعلومات" },
  { v: "industrial", en: "Industrial", ar: "صناعي" }, { v: "health", en: "Health", ar: "صحي" }, { v: "other", en: "IGCSE / other", ar: "IGCSE / أخرى" },
];
const SUBJECTS: Opt[] = [
  { v: "math", en: "Mathematics", ar: "الرياضيات" }, { v: "physics", en: "Physics", ar: "الفيزياء" }, { v: "chemistry", en: "Chemistry", ar: "الكيمياء" },
  { v: "biology", en: "Biology", ar: "الأحياء" }, { v: "computing", en: "Computing / IT", ar: "الحاسوب" }, { v: "english", en: "English", ar: "الإنجليزية" },
  { v: "arabic", en: "Arabic", ar: "العربية" }, { v: "business", en: "Business / economics", ar: "الأعمال / الاقتصاد" }, { v: "arts", en: "Arts & design", ar: "الفنون والتصميم" },
];
const STRENGTHS: Opt[] = [
  { v: "problem solving", en: "Problem solving", ar: "حل المشكلات" }, { v: "creativity", en: "Creativity", ar: "الإبداع" }, { v: "teamwork", en: "Teamwork", ar: "العمل الجماعي" },
  { v: "communication", en: "Communication", ar: "التواصل" }, { v: "leadership", en: "Leadership", ar: "القيادة" }, { v: "caring for others", en: "Caring for others", ar: "رعاية الآخرين" },
  { v: "attention to detail", en: "Attention to detail", ar: "الدقة" }, { v: "self-learning", en: "Learning on my own", ar: "التعلم الذاتي" },
];
const INDUSTRIES: Opt[] = [
  { v: "technology", en: "Technology", ar: "التكنولوجيا" }, { v: "health", en: "Health", ar: "الصحة" }, { v: "engineering", en: "Engineering & construction", ar: "الهندسة والإنشاءات" },
  { v: "business", en: "Business & finance", ar: "الأعمال والمال" }, { v: "education", en: "Education", ar: "التعليم" }, { v: "creative", en: "Creative & media", ar: "الإبداع والإعلام" },
  { v: "public sector", en: "Public sector", ar: "القطاع العام" }, { v: "tourism", en: "Tourism", ar: "السياحة" },
];
const PRIORITIES: Opt<Priority>[] = [
  { v: "affordability", en: "Low cost", ar: "كلفة منخفضة" }, { v: "location", en: "Close to home", ar: "قريبة من السكن" },
  { v: "career-fit", en: "Leads to my dream career", ar: "تقود لمهنة أحلامي" }, { v: "interest-fit", en: "Matches my interests", ar: "تطابق اهتماماتي" },
  { v: "public-university", en: "Public university", ar: "جامعة حكومية" }, { v: "private-university", en: "Private university", ar: "جامعة خاصة" },
];
const BUDGETS = [1000, 1500, 2500, 4000, 6000];

const STEPS = [
  { en: "About you", ar: "عنك" }, { en: "Results", ar: "النتائج" }, { en: "Interests", ar: "الاهتمامات" }, { en: "Strengths", ar: "نقاط القوة" },
  { en: "Future", ar: "المستقبل" }, { en: "Budget", ar: "الميزانية" }, { en: "Place & priorities", ar: "المكان والأولويات" }, { en: "Support", ar: "الدعم" },
];

export function OnboardingForm({ onDone }: { onDone: (p: LearnerProfile) => void }) {
  const { tr, lang, profile } = useBridge();
  const [step, setStep] = useState(0);
  const [p, setP] = useState<LearnerProfile>(profile);
  const [achText, setAchText] = useState("");
  const [careers, setCareers] = useState(profile.dream_careers.join(", "));
  const [hobbies, setHobbies] = useState(profile.hobbies.join(", "));
  const [access, setAccess] = useState(profile.accessibility_needs.join(", "));
  const [noAvg, setNoAvg] = useState(false);
  const [unsureField, setUnsureField] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const L = (o: Opt) => (lang === "ar" ? o.ar : o.en);
  const toggle = <K extends "subjects" | "interests" | "strengths" | "industries" | "preferred_cities">(k: K, v: string) =>
    setP((x) => ({ ...x, [k]: (x[k] as string[]).includes(v) ? (x[k] as string[]).filter((y) => y !== v) : [...(x[k] as string[]), v] }));
  const split = (s: string) => s.split(/[,،\n]/).map((x) => x.trim()).filter(Boolean);

  function validate(): string | null {
    if (step === 0 && !p.education_level) return tr("Choose your current education level.", "اختر مستواك التعليمي الحالي.");
    if (step === 1) {
      if (!p.stream) return tr("Choose your stream (or IGCSE / other).", "اختر فرعك (أو IGCSE / أخرى).");
      if (!noAvg && (p.tawjihi_avg == null || p.tawjihi_avg < 40 || p.tawjihi_avg > 100)) return tr("Enter an average between 40 and 100, or tick \"I don't have it yet\".", "أدخل معدلاً بين 40 و100، أو اختر «لسّه ما طلع المعدّل».");
    }
    if (step === 2 && p.interests.length === 0 && !unsureField) return tr("Pick at least one field, or choose \"Still exploring\".", "اختر تخصصاً واحداً على الأقل، أو اختر «لسّه بستكشف».");
    if (step === 5 && p.budget_jod_per_year != null && p.budget_jod_per_year < 0) return tr("Budget can't be negative.", "لا يمكن أن تكون الميزانية سالبة.");
    if (step === 6 && p.priorities.length > 3) return tr("Pick up to three priorities.", "اختر حتى ثلاث أولويات.");
    return null;
  }

  function next() {
    const e = validate();
    setError(e);
    if (e) return;
    if (step < STEPS.length - 1) { setStep(step + 1); return; }
    const newAchievements: Achievement[] = split(achText).map((t, i) => ({ id: `a-${Date.now()}-${i}`, kind: "other", title: t.slice(0, 80), description: t, links: [] }));
    onDone({
      ...p,
      tawjihi_avg: noAvg ? null : p.tawjihi_avg,
      dream_careers: split(careers),
      career_tags: split(careers).map((c) => c.toLowerCase()),
      hobbies: split(hobbies),
      accessibility_needs: split(access),
      achievements: [...p.achievements, ...newAchievements],
    });
  }

  const pct = Math.round(((step + 1) / STEPS.length) * 100);
  const chips = (opts: Opt[], k: "subjects" | "interests" | "strengths" | "industries", max?: number) => (
    <div className="flex flex-wrap gap-2">
      {opts.map((o) => <button key={o.v} type="button" className="chip" aria-pressed={(p[k] as string[]).includes(o.v)}
        disabled={!!max && !(p[k] as string[]).includes(o.v) && (p[k] as string[]).length >= max} onClick={() => toggle(k, o.v)}>{L(o)}</button>)}
    </div>
  );
  const why = (en: string, ar: string) => <p className="mt-1 text-sm text-muted">{tr(en, ar)}</p>;

  return (
    <form className="card p-5 sm:p-7" onSubmit={(e) => { e.preventDefault(); next(); }} noValidate>
      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-teal">{tr(`Step ${step + 1} of ${STEPS.length}`, `الخطوة ${step + 1} من ${STEPS.length}`)} · {L({ v: "", ...STEPS[step] })}</span>
          <span className="text-muted">{pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-mist" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={tr("Questionnaire progress", "تقدم الاستبيان")}>
          <div className="h-full rounded-full bg-sage transition-all" style={{ width: `${pct}%` }} />
        </div>
        <ol className="mt-3 hidden gap-1 sm:flex" aria-hidden="true">{STEPS.map((s, i) => <li key={i} className={`h-1 flex-1 rounded ${i <= step ? "bg-teal" : "bg-line"}`} />)}</ol>
      </div>

      <fieldset className="mt-6 space-y-5" aria-describedby="step-error">
        {step === 0 && (<>
          <div><label className="label" htmlFor="nm">{tr("What should we call you? (optional)", "شو نناديك؟ (اختياري)")}</label><input id="nm" className="input" value={p.name ?? ""} onChange={(e) => setP({ ...p, name: e.target.value })} /></div>
          <div><p className="label" id="edu-l">{tr("Where are you in your education?", "أين أنت في مسيرتك التعليمية؟")}</p>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="edu-l">{EDU.map((o) => <button key={o.v} type="button" className="chip" aria-pressed={p.education_level === o.v} onClick={() => setP({ ...p, education_level: o.v })}>{L(o)}</button>)}</div></div>
        </>)}
        {step === 1 && (<>
          <div><p className="label" id="st-l">{tr("Tawjihi stream", "فرع التوجيهي")}</p>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="st-l">{STREAMS.map((o) => <button key={o.v} type="button" className="chip" aria-pressed={p.stream === o.v} onClick={() => setP({ ...p, stream: o.v })}>{L(o)}</button>)}</div></div>
          <div><label className="label" htmlFor="av">{tr("Average (%)", "المعدل (%)")}</label>
            <input id="av" className="input max-w-48" type="number" inputMode="decimal" step="0.1" min={40} max={100} disabled={noAvg} value={p.tawjihi_avg ?? ""} onChange={(e) => setP({ ...p, tawjihi_avg: e.target.value === "" ? null : Number(e.target.value) })} />
            <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-teal" checked={noAvg} onChange={(e) => setNoAvg(e.target.checked)} />{tr("I don't have it yet", "لسّه ما طلع المعدّل")}</label>
            {why("Used only to compare with each program's published minimum. It is never shared with employers.", "يُستخدم فقط للمقارنة مع الحد الأدنى المنشور لكل برنامج، ولا يُشارك مع أصحاب العمل.")}</div>
        </>)}
        {step === 2 && (<>
          <div><p className="label">{tr("Favourite school subjects", "موادك المفضلة")}</p>{chips(SUBJECTS, "subjects")}</div>
          <div><p className="label">{tr("Fields you might like to study", "تخصصات ممكن تحب تدرسها")}</p>
            <p className="-mt-1 mb-2 text-sm text-muted">{tr("Still exploring? Start with what interests you.", "لسّه بتستكشف؟ عادي، ابدأ باللي بهمّك.")}</p>{chips(FIELDS.map((f) => ({ v: f.id, en: f.name_en, ar: f.name_ar })), "interests")}
            <button type="button" className="chip mt-2" aria-pressed={unsureField} onClick={() => { setUnsureField(!unsureField); if (!unsureField) setP((x) => ({ ...x, interests: [] })); }}>{tr("Still exploring", "لسّه بستكشف")}</button>
            {why("These are the fields in our current verified dataset. Not sure? We'll show a wider range and ask follow-up questions only where they change the results.", "هذه التخصصات المتوفرة في بياناتنا الموثّقة حالياً. لست متأكداً؟ سنعرض نطاقاً أوسع ونسأل أسئلة إضافية فقط عندما تغيّر النتائج.")}</div>
          <div><label className="label" htmlFor="hb">{tr("Hobbies and interests outside school", "هواياتك واهتماماتك خارج المدرسة")}</label><input id="hb" className="input" value={hobbies} onChange={(e) => setHobbies(e.target.value)} placeholder={tr("e.g. robotics, drawing, football", "مثال: الروبوتات، الرسم، كرة القدم")} /></div>
        </>)}
        {step === 3 && (<>
          <div><p className="label">{tr("Your strengths", "نقاط قوتك")}</p>{chips(STRENGTHS, "strengths")}</div>
          <div><p className="label">{tr("How do you like to learn?", "كيف تفضّل أن تتعلم؟")}</p>
            <div className="flex flex-wrap gap-2">{([["hands-on", "By doing (labs, projects, training)", "بالممارسة (مختبرات، مشاريع، تدريب)"], ["theory", "By understanding the theory first", "بفهم النظرية أولاً"], ["mixed", "A mix of both", "مزيج من الاثنين"]] as const).map(([v, en, ar]) => (
              <button key={v} type="button" className="chip" aria-pressed={p.learning_style === v} onClick={() => setP({ ...p, learning_style: p.learning_style === v ? null : v })}>{tr(en, ar)}</button>))}</div>
            {why("If you learn by doing, programs with published practical training count more for you.", "إذا كنت تتعلم بالممارسة، تحصل البرامج ذات التدريب العملي المنشور على وزن أكبر.")}</div>
          <div><label className="label" htmlFor="ach">{tr("Projects or achievements you're proud of (one per line, optional)", "مشاريع أو إنجازات تفخر بها (واحد في كل سطر، اختياري)")}</label>
            <textarea id="ach" className="input min-h-24" value={achText} onChange={(e) => setAchText(e.target.value)} />
            {why("Saved to your portfolio as self-reported. In Empower you can add details and evidence.", "تُحفظ في ملف إنجازاتك كإفادة ذاتية. يمكنك إضافة التفاصيل والأدلة في مرحلة تمكَّن.")}</div>
        </>)}
        {step === 4 && (<>
          <div><label className="label" htmlFor="cr">{tr("Dream careers (comma separated)", "المهن التي تحلم بها (افصل بفاصلة)")}</label><input id="cr" className="input" value={careers} onChange={(e) => setCareers(e.target.value)} placeholder={tr("e.g. web developer, doctor", "مثال: مطوّر مواقع، طبيب")} /></div>
          <div><p className="label">{tr("Industries that interest you", "القطاعات التي تهمك")}</p>{chips(INDUSTRIES, "industries")}</div>
        </>)}
        {step === 5 && (<>
          <div><p className="label">{tr("Yearly tuition you can cover (JOD)", "الرسوم السنوية اللي بتقدر تغطيها (دينار)")}</p>
            <div className="flex flex-wrap gap-2">{BUDGETS.map((b) => <button key={b} type="button" className="chip" aria-pressed={p.budget_jod_per_year === b} onClick={() => setP({ ...p, budget_jod_per_year: b })}>{b.toLocaleString()}</button>)}
              <button type="button" className="chip" aria-pressed={p.budget_jod_per_year == null} onClick={() => setP({ ...p, budget_jod_per_year: null })}>{tr("Not sure yet", "مش واضح بعد")}</button></div>
            <label className="label mt-3" htmlFor="bg">{tr("Or type an amount", "أو اكتب مبلغاً")}</label>
            <input id="bg" className="input max-w-48" type="number" min={0} step={100} value={p.budget_jod_per_year ?? ""} onChange={(e) => setP({ ...p, budget_jod_per_year: e.target.value === "" ? null : Number(e.target.value) })} /></div>
          <div><p className="label">{tr("Would you need a scholarship, grant or loan?", "هل تحتاج إلى منحة أو قرض؟")}</p>
            <div className="flex flex-wrap gap-2">{([[true, "Yes", "نعم"], [false, "No", "لا"], [null, "Not sure", "لست متأكداً"]] as const).map(([v, en, ar]) => <button key={String(v)} type="button" className="chip" aria-pressed={p.financial_need === v} onClick={() => setP({ ...p, financial_need: v })}>{tr(en, ar)}</button>)}</div></div>
        </>)}
        {step === 6 && (<>
          <div><p className="label">{tr("Where would you like to study?", "أين تحب أن تدرس؟")}</p>
            <div className="flex flex-wrap gap-2">{CITIES.map((c) => <button key={c} type="button" className="chip" aria-pressed={p.preferred_cities.includes(c)} onClick={() => toggle("preferred_cities", c)}>{c}</button>)}</div>
            <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-teal" checked={p.open_to_relocate !== false} onChange={(e) => setP({ ...p, open_to_relocate: e.target.checked })} />{tr("I'm open to moving to another city", "أنا منفتح على الانتقال إلى مدينة أخرى")}</label></div>
          <div><p className="label">{tr("What matters most when choosing? Pick up to 3, most important first", "ما الأهم عند الاختيار؟ اختر حتى 3، الأهم أولاً")}</p>
            <div className="flex flex-wrap gap-2">{PRIORITIES.map((o) => { const i = p.priorities.indexOf(o.v); return (
              <button key={o.v} type="button" className="chip" aria-pressed={i >= 0} disabled={i < 0 && p.priorities.length >= 3}
                onClick={() => setP({ ...p, priorities: i >= 0 ? p.priorities.filter((x) => x !== o.v) : [...p.priorities, o.v] })}>{i >= 0 && <span className="grid size-5 place-items-center rounded-full bg-sand text-xs text-teal-900">{i + 1}</span>}{L(o)}</button>); })}</div>
            {why("Your priorities change how much each factor counts in your fit score. You'll see the effect in the reasons.", "تغيّر أولوياتك وزن كل عامل في درجة الملاءمة، وسترى الأثر في الأسباب.")}</div>
        </>)}
        {step === 7 && (<>
          <div><label className="label" htmlFor="ac">{tr("Accessibility or learning preferences (optional)", "احتياجات الوصول أو تفضيلات التعلم (اختياري)")}</label>
            <textarea id="ac" className="input min-h-20" value={access} onChange={(e) => setAccess(e.target.value)} placeholder={tr("e.g. wheelchair access, captions, prefer Arabic-language courses", "مثال: وصول للكرسي المتحرك، ترجمة نصية، أفضّل الدورات باللغة العربية")} />
            {why("Completely voluntary. Stays on your device and is never shown to employers.", "اختياري تماماً. يبقى على جهازك ولا يظهر لأصحاب العمل أبداً.")}</div>
          <div><p className="label">{tr("Preferred language for courses", "لغة الدورات المفضلة")}</p>
            <p className="text-sm text-muted">{tr("Bridgecom prefers courses in the language you're using now; switch the language at the top to change this.", "يفضّل بريدجكوم الدورات باللغة التي تستخدمها الآن؛ غيّر اللغة من أعلى الصفحة لتعديل ذلك.")}</p></div>
        </>)}
      </fieldset>

      <p id="step-error" role="alert" className={error ? "mt-4 rounded-xl bg-bad-100 p-3 text-sm text-bad" : "sr-only"}>{error ?? ""}</p>

      <div className="mt-6 flex items-center justify-between gap-2">
        <button type="button" className="btn-ghost" disabled={step === 0} onClick={() => { setError(null); setStep(step - 1); }}>{tr("Back", "رجوع")}</button>
        <button type="submit" className="btn-primary !px-7">{step === STEPS.length - 1 ? tr("See my options", "شوف خياراتي") : tr("Continue", "كمّل")}</button>
      </div>
    </form>
  );
}

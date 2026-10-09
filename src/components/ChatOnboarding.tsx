"use client";
import { useEffect, useRef, useState } from "react";
import { useBridge } from "./ProfileProvider";
import { ProfileReview } from "./ProfileReview";
import { ModeBadge } from "./Badges";
import { FIELDS, CITIES } from "@/lib/data/taxonomy";
import type { LearnerProfile } from "@/lib/types";

interface Q { id: string; en: string; ar: string; chipsEn?: string[]; chipsAr?: string[]; multi?: boolean; placeholderEn: string; placeholderAr: string; optional?: boolean }

const QUESTIONS: Q[] = [
  { id: "name", en: "Hi! I'm here to help you find a path that fits you. What should I call you?", ar: "أهلاً! أنا هنا لمساعدتك في إيجاد مسار يناسبك. ماذا أناديك؟", placeholderEn: "Your first name (optional)", placeholderAr: "اسمك الأول (اختياري)", optional: true },
  { id: "results", en: "What was your Tawjihi (or equivalent) average, and which stream were you in?", ar: "ما معدلك في التوجيهي (أو ما يعادله)، وما الفرع الذي درسته؟", chipsEn: ["Scientific", "Literary", "IT", "Industrial", "Health", "IGCSE / other"], chipsAr: ["علمي", "أدبي", "تكنولوجيا المعلومات", "صناعي", "صحي", "IGCSE / شهادة أخرى"], placeholderEn: "e.g. 86.4 in the scientific stream", placeholderAr: "مثال: ٨٦.٤ في الفرع العلمي" },
  { id: "interests", en: "Which subjects or activities do you enjoy most? Pick any that fit, or describe them.", ar: "ما المواد أو الأنشطة التي تستمتع بها أكثر؟ اختر ما يناسبك أو صِفه بكلماتك.", chipsEn: FIELDS.map((f) => f.name_en), chipsAr: FIELDS.map((f) => f.name_ar), multi: true, placeholderEn: "e.g. I love solving problems and making websites", placeholderAr: "مثال: أحب حل المشكلات وتصميم المواقع" },
  { id: "dreams", en: "If everything went well, what would you love to be doing in ten years?", ar: "لو سارت الأمور كما تتمنى، ماذا تحب أن تفعل بعد عشر سنوات؟", placeholderEn: "e.g. building apps that help people in Jordan", placeholderAr: "مثال: بناء تطبيقات تساعد الناس في الأردن" },
  { id: "budget", en: "Roughly how much can your family spend on tuition each year? Would you need a scholarship or support?", ar: "كم تستطيع عائلتك أن تنفق تقريباً على الرسوم سنوياً؟ وهل تحتاج إلى منحة أو دعم؟", chipsEn: ["Under 1000 JOD", "About 1500 JOD", "About 2500 JOD", "About 4000 JOD", "Over 5000 JOD", "I need a scholarship", "Not sure"], chipsAr: ["أقل من 1000 دينار", "حوالي 1500 دينار", "حوالي 2500 دينار", "حوالي 4000 دينار", "أكثر من 5000 دينار", "أحتاج إلى منحة", "لست متأكداً"], multi: true, placeholderEn: "Any detail helps", placeholderAr: "أي تفصيل يساعد" },
  { id: "location", en: "Where would you like to study? Are you open to moving to another city?", ar: "أين تحب أن تدرس؟ وهل أنت منفتح على الانتقال إلى مدينة أخرى؟", chipsEn: [...CITIES.slice(0, 6), "Anywhere is fine"], chipsAr: ["عمّان", "إربد", "الزرقاء", "السلط", "مادبا", "الكرك", "أي مدينة مناسبة"], multi: true, placeholderEn: "e.g. Irbid, but Amman is fine too", placeholderAr: "مثال: إربد، وعمّان مناسبة أيضاً" },
  { id: "type", en: "Do you prefer a public or a private university?", ar: "هل تفضل جامعة حكومية أم خاصة؟", chipsEn: ["Public", "Private", "No preference"], chipsAr: ["حكومية", "خاصة", "لا تفضيل"], placeholderEn: "Anything else about this?", placeholderAr: "أي شيء آخر بهذا الخصوص؟" },
  { id: "access", en: "Is there anything that would make studying easier for you, such as accessibility, health or transport needs? You can skip this.", ar: "هل هناك ما يجعل الدراسة أسهل لك، مثل احتياجات الوصول أو الصحة أو المواصلات؟ يمكنك تخطي هذا السؤال.", chipsEn: ["Nothing specific", "Prefer not to say"], chipsAr: ["لا شيء محدد", "أفضل عدم الإجابة"], placeholderEn: "Optional", placeholderAr: "اختياري", optional: true },
];

type Phase = "chat" | "thinking" | "review";

export function ChatOnboarding({ onDone }: { onDone: (p: LearnerProfile) => void }) {
  const { tr, lang, profile } = useBridge();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<{ q: string; a: string }[]>([]);
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("chat");
  const [draft, setDraft] = useState<LearnerProfile | null>(null);
  const [meta, setMeta] = useState<{ mode: "ai" | "offline"; model?: string; clarifications: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const q = QUESTIONS[step];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); inputRef.current?.focus(); }, [step, phase]);

  function submit(skip = false) {
    const parts = [...picked, text.trim()].filter(Boolean);
    if (!skip && parts.length === 0 && !q.optional) return;
    const a = skip || parts.length === 0 ? "(skipped)" : parts.join("; ");
    const next = [...answers, { q: q.en, a }];
    setAnswers(next); setText(""); setPicked([]);
    if (step + 1 < QUESTIONS.length) setStep(step + 1);
    else interpret(next);
  }

  async function interpret(all: { q: string; a: string }[]) {
    setPhase("thinking"); setError(null);
    try {
      const res = await fetch("/api/ai/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: all }) });
      if (!res.ok) throw new Error((await res.json()).error ?? "Request failed");
      const data = await res.json();
      const d = data.draft;
      const nameAns = all[0]?.a;
      setDraft({
        ...profile,
        name: nameAns && nameAns !== "(skipped)" ? nameAns : profile.name,
        tawjihi_avg: d.tawjihi_avg, stream: d.stream, interests: d.interests, dream_careers: d.dream_careers, career_tags: d.career_tags,
        budget_jod_per_year: d.budget_jod_per_year, financial_need: d.financial_need, preferred_cities: d.preferred_cities,
        open_to_relocate: d.open_to_relocate ?? true, university_type: d.university_type, accessibility_needs: d.accessibility_needs,
        strengths: d.strengths ?? [],
      });
      setMeta({ mode: data.mode, model: data.model, clarifications: d.clarifications ?? [] });
      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("chat");
    }
  }

  const save = onDone;

  return (
    <div>
      {phase !== "review" && (
        <section aria-label={tr("Onboarding conversation", "محادثة التعريف")} className="card p-4 sm:p-6">
          <ol className="space-y-4" aria-live="polite">
            {answers.map((x, i) => (
              <li key={i} className="space-y-2">
                <Bubble who="bot">{lang === "ar" ? QUESTIONS[i].ar : QUESTIONS[i].en}</Bubble>
                <Bubble who="me">{x.a === "(skipped)" ? tr("(skipped)", "(تم التخطي)") : x.a}</Bubble>
              </li>
            ))}
            {phase === "chat" && <li><Bubble who="bot">{lang === "ar" ? q.ar : q.en}</Bubble></li>}
            {phase === "thinking" && (
              <li><Bubble who="bot"><span className="inline-flex items-center gap-2"><Dots /> {tr("Reading your answers and building your profile…", "أقرأ إجاباتك وأبني ملفك…")}</span></Bubble></li>
            )}
          </ol>

          {phase === "chat" && (
            <div className="mt-5 border-t border-line pt-5">
              {q.chipsEn && (
                <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label={tr("Quick answers", "إجابات سريعة")}>
                  {(lang === "ar" ? q.chipsAr! : q.chipsEn).map((c) => (
                    <button key={c} type="button" className="chip" aria-pressed={picked.includes(c)}
                      onClick={() => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : q.multi ? [...p, c] : [c]))}>{c}</button>
                  ))}
                </div>
              )}
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
                <label htmlFor="answer" className="sr-only">{tr("Your answer", "إجابتك")}</label>
                <input id="answer" ref={inputRef} className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={lang === "ar" ? q.placeholderAr : q.placeholderEn} />
                <button className="btn-primary shrink-0" type="submit">{tr("Send", "أرسل")}</button>
              </form>
              <div className="mt-3 flex items-center justify-between text-sm text-muted">
                <span>{tr(`Question ${step + 1} of ${QUESTIONS.length}`, `السؤال ${step + 1} من ${QUESTIONS.length}`)}</span>
                <button type="button" className="underline underline-offset-2" onClick={() => submit(true)}>{tr("Skip", "تخطَّ")}</button>
              </div>
              {error && <p role="alert" className="mt-3 rounded-xl bg-bad-100 p-3 text-sm text-bad">{tr("Something went wrong: ", "حدث خطأ: ")}{error} <button className="underline" onClick={() => interpret(answers)}>{tr("Try again", "حاول مجدداً")}</button></p>}
            </div>
          )}
          <div ref={endRef} />
        </section>
      )}

      {phase === "review" && draft && meta && (
        <section className="card p-5 sm:p-7" aria-labelledby="review-h">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="review-h" className="h2">{tr("Here's what I understood", "هذا ما فهمته")}</h2>
            <ModeBadge mode={meta.mode} model={meta.model} />
          </div>
          <p className="mt-2 text-muted">{tr("Please check and correct anything before we use it. Nothing here decides admission; that is checked against published rules.", "يُرجى التحقق وتصحيح أي شيء قبل استخدامه. لا شيء هنا يقرر القبول؛ يتم ذلك وفق القواعد المنشورة.")}</p>
          {meta.clarifications.length > 0 && (
            <div className="mt-4 rounded-2xl bg-sand-100 p-4 text-sm">
              <p className="font-semibold text-sand-700">{tr("Worth clarifying", "يستحق التوضيح")}</p>
              <ul className="mt-1 list-disc ps-5 text-ink">{meta.clarifications.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
          )}
          <div className="mt-6"><ProfileReview initial={draft} onSave={save} /></div>
        </section>
      )}
    </div>
  );
}

function Bubble({ who, children }: { who: "bot" | "me"; children: React.ReactNode }) {
  return who === "bot" ? (
    <div className="flex gap-3">
      <span aria-hidden="true" className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-teal text-xs font-bold text-ivory">B</span>
      <p className="max-w-[85%] rounded-2xl rounded-ss-sm bg-mist px-4 py-2.5 text-ink">{children}</p>
    </div>
  ) : (
    <div className="flex justify-end"><p className="max-w-[85%] rounded-2xl rounded-se-sm bg-teal px-4 py-2.5 text-ivory">{children}</p></div>
  );
}

function Dots() {
  return <span aria-hidden="true" className="inline-flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="size-1.5 animate-pulse rounded-full bg-sage" style={{ animationDelay: `${i * 150}ms` }} />)}</span>;
}

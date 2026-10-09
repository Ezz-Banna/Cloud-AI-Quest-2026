"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useBridge } from "@/components/ProfileProvider";
import { Sources, VerificationBadge } from "@/components/Badges";
import { FIELD_BY_ID } from "@/lib/data/taxonomy";
import type { ProgramMatch } from "@/lib/engines/programs";

export default function Results() {
  const { profile, setProfile, tr, lang, hydrated, setProgress } = useBridge();
  const [explain, setExplain] = useState<Record<string, { text: string; mode: "ai" | "offline"; model?: string } | "loading">>({});
  const saved = profile.saved_programs ?? [];
  const toggleSave = (id: string) => setProfile((p) => ({ ...p, saved_programs: (p.saved_programs ?? []).includes(id) ? p.saved_programs.filter((x) => x !== id) : [...(p.saved_programs ?? []), id] }));
  async function getExplanation(id: string) {
    setExplain((e) => ({ ...e, [id]: "loading" }));
    try {
      const r = await fetch("/api/ai/explain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile, program_id: id }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setExplain((e) => ({ ...e, [id]: d }));
    } catch (err) {
      setExplain((e) => ({ ...e, [id]: { text: String((err as Error).message), mode: "offline" } }));
    }
  }
  const [matches, setMatches] = useState<ProgramMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlyEligible, setOnlyEligible] = useState(false);
  const [onlyBudget, setOnlyBudget] = useState(false);
  const [onlyInterests, setOnlyInterests] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    setError(null);
    fetch("/api/match/programs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile }) })
      .then(async (r) => { if (!r.ok) throw new Error((await r.json()).error); return r.json(); })
      .then((d) => { setMatches(d.matches); setProgress((p) => ({ ...p, discover_done: true })); })
      .catch((e) => setError(String(e.message ?? e)));
  }, [hydrated, profile, setProgress]);

  const shown = useMemo(() => (matches ?? []).filter((m) =>
    (!onlyEligible || m.eligibility.status === "meets-published-minimum") &&
    (!onlyBudget || m.cost.within_budget !== false) &&
    (!onlyInterests || profile.interests.length === 0 || profile.interests.includes(m.program.field))), [matches, onlyEligible, onlyBudget, onlyInterests, profile.interests]);

  if (hydrated && profile.tawjihi_avg == null && profile.interests.length === 0) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <h1 className="h2">{tr("Let's start with a few questions", "لنبدأ ببعض الأسئلة")}</h1>
        <p className="mt-2 text-muted">{tr("We need your results and interests before we can suggest programs.", "نحتاج إلى نتائجك واهتماماتك قبل اقتراح البرامج.")}</p>
        <Link href="/discover" className="btn-primary mt-6">{tr("Start Discover", "ابدأ الاكتشاف")}</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{tr("Stage 1 · Discover", "المرحلة 1 · اكتشف")}</p>
          <h1 className="h1 mt-2">{profile.name ? tr(`${profile.name.split(" ")[0]}, here are your matches`, `${profile.name.split(" ")[0]}، هذه نتائجك`) : tr("Your program matches", "البرامج المناسبة لك")}</h1>
          <p className="mt-2 max-w-2xl text-muted">{tr("Two separate questions, answered separately: can you meet the published admission minimum (rules, with source and year), and how well does the program fit you (your interests, career goals, budget and location).", "سؤالان منفصلان يُجاب عنهما بشكل منفصل: هل تحقق الحد الأدنى المنشور للقبول (قواعد مع المصدر والسنة)، وما مدى ملاءمة البرنامج لك (اهتماماتك وأهدافك المهنية وميزانيتك وموقعك).")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/discover" className="btn-secondary">{tr("Edit my answers", "عدّل إجاباتي")}</Link>
          <Link href="/compare" className="btn-primary">{tr(`Compare saved (${saved.length})`, `قارن المحفوظة (${saved.length})`)}</Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        {profile.tawjihi_avg != null && <span className="chip">{tr("Average", "المعدل")}: {profile.tawjihi_avg}</span>}
        {profile.stream && <span className="chip">{tr("Stream", "الفرع")}: {profile.stream}</span>}
        {profile.budget_jod_per_year != null && <span className="chip">{tr("Budget", "الميزانية")}: {profile.budget_jod_per_year} JOD/{tr("yr", "سنة")}</span>}
        {profile.preferred_cities.length > 0 && <span className="chip">{profile.preferred_cities.join(", ")}</span>}
      </div>

      <fieldset className="mt-4 flex flex-wrap gap-2">
        <legend className="sr-only">{tr("Filters", "عوامل التصفية")}</legend>
        <button type="button" className="chip" aria-pressed={onlyInterests} onClick={() => setOnlyInterests(!onlyInterests)}>{tr("My fields only", "تخصصاتي فقط")}</button>
        <button type="button" className="chip" aria-pressed={onlyEligible} onClick={() => setOnlyEligible(!onlyEligible)}>{tr("Meets minimum to apply", "يحقق الحد الأدنى للتقديم")}</button>
        <button type="button" className="chip" aria-pressed={onlyBudget} onClick={() => setOnlyBudget(!onlyBudget)}>{tr("Hide over budget", "إخفاء ما يتجاوز الميزانية")}</button>
      </fieldset>

      {profile.accessibility_needs.length > 0 && (
        <p className="mt-4 rounded-2xl bg-mist p-4 text-sm text-teal">{tr("You mentioned support needs. Ask each university's student affairs or disability support office about accommodations; we don't yet hold verified accessibility data per campus.", "ذكرت احتياجات دعم. اسأل شؤون الطلبة أو مكتب دعم ذوي الإعاقة في كل جامعة عن الترتيبات المتاحة؛ لا نملك بعد بيانات موثّقة عن إمكانية الوصول لكل حرم جامعي.")}</p>
      )}

      {error && <p role="alert" className="mt-6 rounded-xl bg-bad-100 p-4 text-bad">{error}</p>}
      {!matches && !error && <ul className="mt-6 space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <li key={i} className="card h-28 animate-pulse bg-mist/60" />)}</ul>}
      {matches && matches.length === 0 && (
        <p className="card mt-6 p-6 text-muted">{tr("No program data is loaded yet. See About the data.", "لم يتم تحميل بيانات البرامج بعد. راجع صفحة عن البيانات.")}</p>
      )}
      {matches && matches.length > 0 && shown.length === 0 && (
        <p className="card mt-6 p-6 text-muted">{tr("No programs match these filters. Try removing one.", "لا توجد برامج تطابق عوامل التصفية. جرّب إزالة أحدها.")}</p>
      )}

      <p className="mt-6 text-sm text-muted" aria-live="polite">{matches ? tr(`${shown.length} of ${matches.length} programs in our verified subset`, `${shown.length} من ${matches.length} برنامجاً في مجموعتنا الموثّقة`) : ""}</p>
      <ol className="mt-3 space-y-4">
        {shown.map((m) => {
          const id = m.program.id;
          const field = FIELD_BY_ID[m.program.field];
          return (
            <li key={id} className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-teal">{lang === "ar" && m.program.name_ar ? m.program.name_ar : m.program.name_en}</h2>
                  <p className="text-muted">{lang === "ar" && m.university.name_ar ? m.university.name_ar : m.university.name_en} · {m.university.city ?? "—"} · {m.university.type === "public" ? tr("Public", "حكومية") : tr("Private", "خاصة")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <VerificationBadge v={m.program.verification} />
                  <button type="button" className="chip !py-1" aria-pressed={saved.includes(id)} onClick={() => toggleSave(id)}>
                    {saved.includes(id) ? `★ ${tr("Saved", "محفوظ")}` : `☆ ${tr("Save", "احفظ")}`}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                <Eligibility m={m} />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">{tr("Fit for you", "مدى الملاءمة")}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-mist" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={m.suitability} aria-label={tr("Fit score", "درجة الملاءمة")}>
                      <div className="h-full rounded-full bg-sage" style={{ width: `${m.suitability}%` }} />
                    </div>
                    <span className="w-10 text-end font-bold text-teal">{m.suitability}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{field ? (lang === "ar" ? field.name_ar : field.name_en) : m.program.field}</p>
                </div>
                <div className="md:text-end">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">{tr("Tuition estimate", "تقدير الرسوم")}</p>
                  {m.cost.per_year_jod != null ? (
                    <p className="mt-1"><span className="text-lg font-bold text-teal">~{m.cost.per_year_jod.toLocaleString()} JOD</span><span className="text-sm text-muted">/{tr("yr", "سنة")}</span></p>
                  ) : <p className="mt-1 text-sm text-muted">{tr("Not verified yet", "غير موثّق بعد")}</p>}
                  {m.cost.within_budget === false && <p className="text-xs font-semibold text-bad">{tr("Above your budget", "أعلى من ميزانيتك")}</p>}
                </div>
              </div>

              {m.missing_data.length > 0 && (
                <p className="mt-3 flex flex-wrap gap-1.5 text-xs" aria-label={tr("Missing data", "بيانات ناقصة")}>
                  {m.missing_data.map((x) => <span key={x} className="rounded-full border border-dashed border-warn px-2 py-0.5 text-warn">{tr("Missing", "ناقص")}: {x}</span>)}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" className="btn-ghost !px-0" aria-expanded={open === id} aria-controls={`why-${id}`} onClick={() => setOpen(open === id ? null : id)}>
                {open === id ? tr("Hide reasons and sources", "إخفاء الأسباب والمصادر") : tr("Why this recommendation?", "لماذا هذه التوصية؟")}
              </button>
              <button type="button" className="btn-ghost" disabled={explain[id] === "loading"} onClick={() => getExplanation(id)}>✦ {explain[id] === "loading" ? tr("Writing…", "جارٍ الكتابة…") : tr("Explain in plain words", "اشرح بكلمات بسيطة")}</button>
              </div>
              {explain[id] && explain[id] !== "loading" && (() => { const e = explain[id] as { text: string; mode: "ai" | "offline"; model?: string }; return (
                <div className="mt-2 rounded-2xl bg-mist p-4 text-sm" role="status">
                  <p>{e.text}</p>
                  <p className="mt-2 text-xs text-muted">{e.mode === "ai" ? tr("Written by AI from the computed reasons above; numbers checked against the data.", "كتبه الذكاء الاصطناعي من الأسباب المحسوبة أعلاه؛ تم التحقق من الأرقام مقابل البيانات.") : tr("Template explanation (AI unavailable or its answer failed our checks).", "شرح من قالب (الذكاء الاصطناعي غير متاح أو لم تجتز إجابته فحوصاتنا).")}</p>
                </div>); })()}
              {open === id && (
                <div id={`why-${id}`} className="mt-2 grid gap-5 rounded-2xl bg-ivory p-4 md:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-bold text-teal">{tr("How the fit score was built", "كيف بُنيت درجة الملاءمة")}</h3>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {m.reasons.length === 0 && <li className="text-muted">{tr("No strong signals either way.", "لا توجد مؤشرات قوية في أي اتجاه.")}</li>}
                      {m.reasons.map((r) => (
                        <li key={r.code} className="flex gap-2"><span aria-hidden="true" className={r.weight > 0 ? "text-ok" : r.weight < 0 ? "text-bad" : "text-muted"}>{r.weight > 0 ? "+" : r.weight < 0 ? "−" : "•"}</span><span>{lang === "ar" ? r.ar : r.en}</span></li>
                      ))}
                    </ul>
                    {m.cost.total_tuition_jod != null && <p className="mt-3 text-xs text-muted">{tr("Cost basis", "أساس الكلفة")}: {m.cost.basis}</p>}
                    {m.missing_data.length > 0 && <p className="mt-2 text-xs text-warn">{tr("Not yet verified", "غير موثّق بعد")}: {m.missing_data.join(", ")}</p>}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-teal">{tr("Sources", "المصادر")}</h3>
                    <div className="mt-2"><Sources sources={[...m.program.sources, ...m.university.sources]} /></div>
                    {m.program.notes && <p className="mt-3 text-xs text-muted">{m.program.notes}</p>}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <section className="mt-12 rounded-[1.25rem] bg-teal p-8 text-ivory">
        <p className="eyebrow !text-sand">{tr("Next · Empower", "التالي · تمكَّن")}</p>
        <h2 className="mt-2 text-2xl font-bold">{tr("Your average is only part of your story.", "معدلك جزء من قصتك فقط.")}</h2>
        <p className="mt-2 max-w-2xl text-mist">{tr("Add projects, volunteering and certificates. We'll help you describe the skills they show and find scholarships worth checking.", "أضف مشاريعك وتطوعك وشهاداتك. سنساعدك على وصف المهارات التي تظهرها ونقترح منحاً تستحق التحقق منها.")}</p>
        <Link href="/empower" className="btn mt-6 bg-sand text-teal-900 hover:bg-sand-100">{tr("Build my skills profile", "ابنِ ملف مهاراتي")}</Link>
      </section>
    </div>
  );
}

function Eligibility({ m }: { m: ProgramMatch }) {
  const { tr, profile } = useBridge();
  const e = m.eligibility;
  const cfg = {
    "meets-published-minimum": { cls: "bg-ok-100 text-ok", en: "Meets minimum average to apply", ar: "يحقق الحد الأدنى للتقديم" },
    "below-published-minimum": { cls: "bg-bad-100 text-bad", en: "Below minimum average to apply", ar: "أقل من الحد الأدنى للتقديم" },
    "stream-mismatch": { cls: "bg-bad-100 text-bad", en: "Stream not listed as eligible", ar: "الفرع غير مدرج ضمن المؤهلين" },
    "minimum-not-verified": { cls: "bg-warn-100 text-warn", en: "Minimum not verified yet", ar: "الحد الأدنى غير موثّق بعد" },
    "missing-student-average": { cls: "bg-mist text-muted", en: "Add your average to check", ar: "أضف معدلك للتحقق" },
  }[e.status];
  const detail = e.status === "meets-published-minimum" || e.status === "below-published-minimum"
    ? tr(`Your ${profile.tawjihi_avg} vs. published ${e.published_min}${e.year ? ` (${e.year}` : ""}${e.track ? `, ${e.track}` : ""}${e.year ? ")" : ""}. This is the minimum to apply, not the competitive cut-off, which is usually higher and changes yearly. Not an admission decision.`,
         `معدلك ${profile.tawjihi_avg} مقابل الحد المنشور ${e.published_min}${e.year ? ` (${e.year})` : ""}. هذا الحد الأدنى للتقديم وليس معدل القبول التنافسي، الذي يكون عادةً أعلى ويتغير سنوياً. ليس قرار قبول.`)
    : e.status === "minimum-not-verified" ? tr("Check the official admission list before deciding.", "تحقق من قوائم القبول الرسمية قبل اتخاذ القرار.") : "";
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{tr("Admission check (rules)", "فحص القبول (قواعد)")}</p>
      <span className={`mt-1.5 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${cfg.cls}`}>{tr(cfg.en, cfg.ar)}</span>
      {detail && <p className="mt-1.5 text-xs text-muted">{detail}</p>}
    </div>
  );
}

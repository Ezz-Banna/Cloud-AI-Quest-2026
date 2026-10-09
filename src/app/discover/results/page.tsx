"use client";
import Link from "next/link";
import { cityLabel, missingLabel, streamLabel } from "@/lib/i18n";
import { useEffect, useMemo, useState } from "react";
import { useBridge } from "@/components/ProfileProvider";
import { Sources, VerificationBadge } from "@/components/Badges";
import { FIELD_BY_ID } from "@/lib/data/taxonomy";
import type { FollowUp, ProgramMatch } from "@/lib/engines/programs";
import type { FitCriterion } from "@/lib/types";

type Crit = { id: FitCriterion; en: string; ar: string; weight: number };
const CRIT_HELP: Record<FitCriterion, { en: string; ar: string }> = {
  interest: { en: "The field is one you picked", ar: "التخصص من المجالات التي اخترتها" },
  curriculum: { en: "The published study plan covers subjects you enjoy", ar: "الخطة الدراسية المنشورة تشمل مواد تحبها" },
  career: { en: "The field usually leads toward work you mentioned", ar: "التخصص يقود عادة إلى عمل ذكرته" },
  affordability: { en: "Estimated yearly cost compared with your budget", ar: "الكلفة السنوية التقديرية مقارنة بميزانيتك" },
  location: { en: "Campus in a city you prefer", ar: "الحرم في مدينة تفضلها" },
  type: { en: "Public or private, as you prefer", ar: "حكومية أو خاصة حسب تفضيلك" },
  applied: { en: "Practical training or internship in the plan", ar: "تدريب عملي في الخطة" },
};

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
  const [criteria, setCriteria] = useState<Crit[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [draftW, setDraftW] = useState<Partial<Record<FitCriterion, number>> | null>(null);
  const [showWeights, setShowWeights] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    setError(null);
    setUpdating(true);
    const ctl = new AbortController();
    fetch("/api/match/programs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile }), signal: ctl.signal })
      .then(async (r) => { if (!r.ok) throw new Error((await r.json()).error); return r.json(); })
      .then((d) => { setMatches(d.matches); setCriteria(d.criteria); setFollowUps(d.follow_ups ?? []); setUpdating(false); setProgress((p) => ({ ...p, discover_done: true })); })
      .catch((e) => { if ((e as Error).name !== "AbortError") { setError(String(e.message ?? e)); setUpdating(false); } });
    return () => ctl.abort();
  }, [hydrated, profile, setProgress]);

  // Slider changes re-rank shortly after the student stops dragging.
  useEffect(() => {
    if (!draftW) return;
    const t = setTimeout(() => setProfile((p) => ({ ...p, fit_weights: { ...(p.fit_weights ?? {}), ...draftW } })), 180);
    return () => clearTimeout(t);
  }, [draftW, setProfile]);
  const weightOf = (c: Crit) => draftW?.[c.id] ?? c.weight;

  const shown = useMemo(() => (matches ?? []).filter((m) =>
    (!onlyEligible || m.eligibility.group === "eligible") &&
    (!onlyBudget || m.cost.within_budget !== false) &&
    (!onlyInterests || profile.interests.length === 0 || profile.interests.includes(m.program.field))), [matches, onlyEligible, onlyBudget, onlyInterests, profile.interests]);

  if (hydrated && profile.tawjihi_avg == null && profile.interests.length === 0 && !profile.education_level) {
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
        {profile.stream && <span className="chip">{tr("Stream", "الفرع")}: {streamLabel(profile.stream, lang)}</span>}
        {profile.budget_jod_per_year != null && <span className="chip">{tr("Budget", "الميزانية")}: {profile.budget_jod_per_year} JOD/{tr("yr", "سنة")}</span>}
        {profile.preferred_cities.length > 0 && <span className="chip">{profile.preferred_cities.map((c) => cityLabel(c, lang)).join(lang === "ar" ? "، " : ", ")}</span>}
      </div>

      <fieldset className="mt-4 flex flex-wrap gap-2">
        <legend className="sr-only">{tr("Filters", "عوامل التصفية")}</legend>
        <button type="button" className="chip" aria-pressed={onlyInterests} onClick={() => setOnlyInterests(!onlyInterests)}>{tr("My fields only", "تخصصاتي فقط")}</button>
        <button type="button" className="chip" aria-pressed={onlyEligible} onClick={() => setOnlyEligible(!onlyEligible)}>{tr("Meets minimum to apply", "يحقق الحد الأدنى للتقديم")}</button>
        <button type="button" className="chip" aria-pressed={onlyBudget} onClick={() => setOnlyBudget(!onlyBudget)}>{tr("Hide over budget", "إخفاء ما يتجاوز الميزانية")}</button>
      </fieldset>

      <section className="card mt-4 p-4 sm:p-5" aria-labelledby="w-h">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="w-h" className="font-bold text-teal">{tr("What matters most to you?", "ما الأهم بالنسبة لك؟")}</h2>
            <p className="text-sm text-muted">{tr("Move a slider and the ranking updates. 0 means ignore it.", "حرّك المؤشر وسيتحدث الترتيب. 0 يعني تجاهله.")}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" aria-expanded={showWeights} aria-controls="weights" onClick={() => setShowWeights(!showWeights)}>{showWeights ? tr("Hide", "إخفاء") : tr("Adjust priorities", "عدّل الأولويات")}</button>
            {profile.fit_weights && Object.keys(profile.fit_weights).length > 0 && <button type="button" className="btn-ghost" onClick={() => { setDraftW(null); setProfile((p) => ({ ...p, fit_weights: undefined })); }}>{tr("Reset", "إعادة ضبط")}</button>}
          </div>
        </div>
        {showWeights && (
          <div id="weights" className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {criteria.map((c) => (
              <div key={c.id}>
                <label htmlFor={`w-${c.id}`} className="flex justify-between text-sm font-semibold text-teal"><span>{tr(c.en, c.ar)}</span><span aria-hidden="true">{weightOf(c)}</span></label>
                <input id={`w-${c.id}`} type="range" min={0} max={5} step={1} value={weightOf(c)} className="w-full accent-[#6F9C94]" aria-describedby={`wh-${c.id}`}
                  onChange={(e) => setDraftW((d) => ({ ...(d ?? {}), [c.id]: Number(e.target.value) }))} />
                <p id={`wh-${c.id}`} className="text-xs text-muted">{tr(CRIT_HELP[c.id].en, CRIT_HELP[c.id].ar)}</p>
              </div>
            ))}
            <p className="text-xs text-muted sm:col-span-2">{tr("How it works: each factor gets a score from 0 to 1 using the stored records, multiplied by your weight. Factors without data are left out instead of guessed, and the card says how much of what matters to you could be checked. The fit score is not a chance of admission.", "طريقة العمل: يحصل كل عامل على درجة من 0 إلى 1 من السجلات المخزنة، مضروبة في وزنك. العوامل بلا بيانات تُستبعد بدل تخمينها، وتوضح البطاقة نسبة ما أمكن التحقق منه مما يهمك. درجة الملاءمة ليست فرصة قبول.")}</p>
          </div>
        )}
        <p className="sr-only" aria-live="polite">{updating ? tr("Updating ranking", "جارٍ تحديث الترتيب") : ""}</p>
      </section>

      {followUps.length > 0 && (
        <section className="mt-4 rounded-2xl border border-sand bg-sand-100/40 p-4" aria-labelledby="fu-h">
          <h2 id="fu-h" className="font-bold text-teal">{tr("A few answers would sharpen these results", "بعض الإجابات ستجعل النتائج أدق")}</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {followUps.map((q) => <li key={q.id}><span className="font-semibold text-teal">{tr(q.en, q.ar)}</span> <span className="text-muted">{tr(q.why_en, q.why_ar)}</span></li>)}
          </ul>
          <Link href="/discover" className="btn-secondary mt-3">{tr("Answer in Discover", "أجب في صفحة الاكتشاف")}</Link>
        </section>
      )}

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
            <li key={id} id={`prog-${id}`} className="card scroll-mt-24 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-teal">{(lang === "ar" ? m.program.name_ar ?? FIELD_BY_ID[m.program.field]?.name_ar ?? m.program.name_en : m.program.name_en)}</h2>
                  {lang === "ar" && !m.program.name_ar && <p lang="en" dir="ltr" className="text-xs text-muted">{m.program.name_en}</p>}
                  <p className="text-muted">{lang === "ar" && m.university.name_ar ? m.university.name_ar : m.university.name_en} · {cityLabel(m.university.city, lang)} · {m.university.type === "public" ? tr("Public", "حكومية") : tr("Private", "خاصة")}</p>
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
                  <p className="mt-1 text-xs text-muted">{field ? (lang === "ar" ? field.name_ar : field.name_en) : m.program.field} · {tr(`based on ${Math.round(m.coverage * 100)}% of what matters to you`, `مبنية على ${Math.round(m.coverage * 100)}% مما يهمك`)}</p>
                  <p className="text-xs text-muted">{tr("Not a chance of admission.", "ليست فرصة قبول.")}</p>
                </div>
                <div className="md:text-end">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">{tr("Tuition estimate", "تقدير الرسوم")}</p>
                  {m.cost.per_year_jod != null ? (
                    <p className="mt-1"><span className="text-lg font-bold text-teal">~{m.cost.per_year_jod.toLocaleString()} JOD</span><span className="text-sm text-muted">/{tr("yr", "سنة")}</span></p>
                  ) : <p className="mt-1 text-sm text-muted">{tr("Not verified yet", "غير موثّق بعد")}</p>}
                  {m.cost.within_budget === false && <p className="text-xs font-semibold text-bad">{tr("Above your budget", "أعلى من ميزانيتك")}</p>}
                  {m.cost.per_year_jod != null && <p className="text-xs text-muted">{m.cost.extra_fees_jod != null ? tr("incl. other fees", "شاملة الرسوم الأخرى") : tr("tuition only", "رسوم الساعات فقط")}{m.cost.fee_year ? ` · ${tr("fees", "رسوم")} ${m.cost.fee_year}` : ""}{m.cost.checked_at ? ` · ${tr("checked", "تحقق")} ${m.cost.checked_at}` : ""}</p>}
                </div>
              </div>

              {(m.strengths.length > 0 || m.trade_offs.length > 0) && (
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ok">{tr("Why it fits", "لماذا يناسبك")}</h3>
                    <ul className="mt-1 space-y-1">{m.strengths.slice(0, 3).map((r, i) => <li key={i} className="flex gap-2"><span aria-hidden="true" className="text-ok">+</span>{lang === "ar" ? r.ar : r.en}</li>)}
                      {m.strengths.length === 0 && <li className="text-muted">{tr("No strong match on what you told us.", "لا تطابق قوياً مع ما أخبرتنا به.")}</li>}</ul>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-warn">{tr("Trade-offs", "مقايضات")}</h3>
                    <ul className="mt-1 space-y-1">{m.trade_offs.slice(0, 3).map((r, i) => <li key={i} className="flex gap-2"><span aria-hidden="true" className="text-warn">−</span>{lang === "ar" ? r.ar : r.en}</li>)}
                      {m.trade_offs.length === 0 && <li className="text-muted">{tr("None found in the data we hold.", "لم نجد مقايضات في البيانات المتوفرة.")}</li>}</ul>
                  </div>
                </div>
              )}
              {m.alternatives.length > 0 && (
                <div className="mt-3 rounded-2xl bg-mist/60 p-3 text-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-teal">{tr("Alternatives to consider", "بدائل تستحق النظر")}</h3>
                  <ul className="mt-1 space-y-1">{m.alternatives.map((a) => <li key={a.program_id + a.kind}><a className="underline" href={`#prog-${a.program_id}`} onClick={() => { setOnlyInterests(false); setOnlyEligible(false); setOnlyBudget(false); }}>{lang === "ar" ? a.ar : a.en}</a></li>)}</ul>
                </div>
              )}
              {m.missing_data.length > 0 && (
                <p className="mt-3 flex flex-wrap gap-1.5 text-xs" aria-label={tr("Missing data", "بيانات ناقصة")}>
                  {m.missing_data.map((x) => <span key={x} className="rounded-full border border-dashed border-warn px-2 py-0.5 text-warn">{tr("Missing", "ناقص")}: {missingLabel(x, lang)}</span>)}
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
                    <table className="mt-2 w-full text-sm">
                      <thead className="sr-only"><tr><th>{tr("Factor", "العامل")}</th><th>{tr("Your weight", "وزنك")}</th><th>{tr("Points", "النقاط")}</th></tr></thead>
                      <tbody>
                        {m.factors.filter((f) => f.weight > 0).map((f) => (
                          <tr key={f.criterion} className="align-top">
                            <td className="py-1 pe-2"><span className="font-semibold text-teal">{tr(criteria.find((c) => c.id === f.criterion)?.en ?? f.criterion, criteria.find((c) => c.id === f.criterion)?.ar ?? f.criterion)}</span><br /><span className={f.score == null ? "text-xs text-muted" : "text-xs"}>{lang === "ar" ? f.ar : f.en}</span></td>
                            <td className="py-1 pe-2 text-xs text-muted whitespace-nowrap">×{f.weight}</td>
                            <td className="py-1 text-end font-semibold whitespace-nowrap">{f.score == null ? <span className="text-xs font-normal text-muted">{tr("left out", "مستبعد")}</span> : `+${f.points}`}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot><tr><td className="pt-2 font-bold text-teal">{tr("Fit score", "درجة الملاءمة")}</td><td /><td className="pt-2 text-end font-bold text-teal">{m.suitability}</td></tr></tfoot>
                    </table>
                    <p className="mt-3 text-xs text-muted">{tr("Cost basis", "أساس الكلفة")}: {lang === "ar" ? m.cost.basis_ar : m.cost.basis}</p>
                    {m.program.study_plan_url && <p className="mt-1 text-xs"><a className="underline" href={m.program.study_plan_url} target="_blank" rel="noreferrer">{tr("Published study plan", "الخطة الدراسية المنشورة")} ↗</a></p>}
                    {m.missing_data.length > 0 && <p className="mt-2 text-xs text-warn">{tr("Not yet verified", "غير موثّق بعد")}: {m.missing_data.map((x) => missingLabel(x, lang)).join(lang === "ar" ? "، " : ", ")}</p>}
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
    "minimum-not-verified": { cls: "bg-warn-100 text-warn", en: "Unknown: minimum not verified yet", ar: "غير معروف: الحد الأدنى غير موثّق بعد" },
    "conflicting-sources": { cls: "bg-warn-100 text-warn", en: "Unknown: sources disagree", ar: "غير معروف: المصادر مختلفة" },
    "missing-student-average": { cls: "bg-mist text-muted", en: "Add your average to check", ar: "أضف معدلك للتحقق" },
  }[e.status];
  const detail = e.status === "meets-published-minimum" || e.status === "below-published-minimum"
    ? tr(`Your ${profile.tawjihi_avg} vs. published ${e.published_min}${e.year ? ` (${e.year}` : ""}${e.track ? `, ${e.track}` : ""}${e.year ? ")" : ""}. This is the minimum to apply, not the competitive cut-off, which is usually higher and changes yearly. Not an admission decision.`,
         `معدلك ${profile.tawjihi_avg} مقابل الحد المنشور ${e.published_min}${e.year ? ` (${e.year})` : ""}. هذا الحد الأدنى للتقديم وليس معدل القبول التنافسي، الذي يكون عادةً أعلى ويتغير سنوياً. ليس قرار قبول.`)
    : e.status === "minimum-not-verified" || e.status === "conflicting-sources" ? tr("Check the official admission list before deciding.", "تحقق من قوائم القبول الرسمية قبل اتخاذ القرار.") : "";
  const cut = e.last_cutoff ? tr(`Past competitive cut-off: ${e.last_cutoff.value} (${e.last_cutoff.year}). History only, not a prediction.`, `معدل القبول التنافسي السابق: ${e.last_cutoff.value} (${e.last_cutoff.year}). للاطلاع فقط وليس توقعاً.`) : "";
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{tr("Admission check (rules)", "فحص القبول (قواعد)")}</p>
      <span className={`mt-1.5 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${cfg.cls}`}>{tr(cfg.en, cfg.ar)}</span>
      {detail && <p className="mt-1.5 text-xs text-muted">{detail}</p>}
      {cut && <p className="mt-1 text-xs text-muted">{cut}</p>}
    </div>
  );
}

"use client";
import { FitMeter } from "@/components/FitMeter";
import Link from "next/link";
import { cityLabel, missingLabel, streamLabel } from "@/lib/i18n";
import { useEffect, useMemo, useState } from "react";
import { useBridge } from "@/components/ProfileProvider";
import { Sources, VerificationBadge } from "@/components/Badges";
import { Icon } from "@/components/Visuals";
import { FIELD_BY_ID } from "@/lib/data/taxonomy";
import type { FollowUp, ProgramMatch } from "@/lib/engines/programs";
import type { FitCriterion } from "@/lib/types";

const PAGE = 5;
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
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  useEffect(() => { if (!saveMsg) return; const t = setTimeout(() => setSaveMsg(null), 3000); return () => clearTimeout(t); }, [saveMsg]);
  const toggleSave = (id: string) => {
    const adding = !saved.includes(id);
    setProfile((p) => ({ ...p, saved_programs: (p.saved_programs ?? []).includes(id) ? p.saved_programs.filter((x) => x !== id) : [...(p.saved_programs ?? []), id] }));
    // Confirm only once the change is actually stored on this device.
    setTimeout(() => {
      let ok = false;
      try { ok = (JSON.parse(localStorage.getItem("bridgecom.profile.v1") ?? "null")?.saved_programs ?? []).includes(id) === adding; } catch { ok = false; }
      setSaveMsg(ok ? (adding ? tr("Saved to your plan.", "انحفظت بخطتك.") : tr("Removed from your plan.", "انشالت من خطتك.")) : tr("Couldn’t save on this device. Check that browser storage is allowed.", "ما قدرنا نحفظ على هذا الجهاز. تأكّد إن التخزين بالمتصفح مسموح."));
    }, 50);
  };
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
  const [showAll, setShowAll] = useState(false);

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
          <h1 className="h1">{profile.name ? tr(`${profile.name.split(" ")[0]}, here are your study options`, `${profile.name.split(" ")[0]}، هاي خياراتك للدراسة`) : tr("Your study options", "خياراتك للدراسة")}</h1>
          <p className="mt-3 flex flex-wrap gap-2 text-sm" aria-label={tr("Each program gets two separate checks", "يحصل كل برنامج على فحصين منفصلين")}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1 font-semibold text-teal"><Icon name="rules" className="size-4" />{tr("Can I apply? Published minimum", "هل يمكنني التقديم؟ الحد المنشور")}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1 font-semibold text-teal"><Icon name="reasons" className="size-4" />{tr("How well does it fit me?", "ما مدى ملاءمته لي؟")}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1 font-semibold text-teal"><Icon name="cost" className="size-4" />{tr("Yearly cost", "الكلفة السنوية")}</span>
          </p>
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
            <p className="text-xs text-muted sm:col-span-2">{tr("0 ignores a factor. Factors without data are left out, not guessed.", "0 يعني تجاهل العامل. العوامل بلا بيانات تُستبعد ولا تُخمَّن.")}</p>
          </div>
        )}
        {saveMsg && <p role="status" className="fixed bottom-4 start-1/2 z-40 -translate-x-1/2 rtl:translate-x-1/2 rounded-full bg-teal px-4 py-2 text-sm font-semibold text-ivory shadow-lg">{saveMsg}</p>}
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
        <p className="mt-4 rounded-2xl bg-mist p-4 text-sm text-teal">{tr("For support needs, ask each university's student affairs office. We hold no verified accessibility data per campus yet.", "لاحتياجات الدعم، اسأل شؤون الطلبة في كل جامعة. لا نملك بعد بيانات موثّقة عن إمكانية الوصول لكل حرم.")}</p>
      )}

      {error && <p role="alert" className="mt-6 rounded-xl bg-bad-100 p-4 text-bad">{error}</p>}
      {!matches && !error && <ul className="mt-6 space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <li key={i} className="card h-28 animate-pulse bg-mist/60" />)}</ul>}
      {matches && matches.length === 0 && (
        <p className="empty-state mt-6">{tr("No program data is loaded yet. See About the data.", "لم يتم تحميل بيانات البرامج بعد. راجع صفحة عن البيانات.")}</p>
      )}
      {matches && matches.length > 0 && shown.length === 0 && (
        <p className="empty-state mt-6">{tr("No programs match these filters. Try removing one.", "لا توجد برامج تطابق عوامل التصفية. جرّب إزالة أحدها.")}</p>
      )}

      <p className="mt-6 text-sm text-muted" aria-live="polite">{matches ? tr(`${shown.length} of ${matches.length} programs in our verified subset`, `${shown.length} من ${matches.length} برنامجاً في مجموعتنا الموثّقة`) : ""}</p>
      <ol className="mt-3 space-y-4">
        {shown.slice(0, showAll ? undefined : PAGE).map((m) => {
          const id = m.program.id;
          const field = FIELD_BY_ID[m.program.field];
          return (
            <li key={id} id={`prog-${id}`} className="card scroll-mt-24 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold leading-snug text-teal">{(lang === "ar" ? m.program.name_ar ?? FIELD_BY_ID[m.program.field]?.name_ar ?? m.program.name_en : m.program.name_en)}</h2>
                  {lang === "ar" && !m.program.name_ar && <p lang="en" dir="ltr" className="text-xs text-muted">{m.program.name_en}</p>}
                  <p className="mt-0.5 text-muted"><span className="font-medium text-ink">{lang === "ar" && m.university.name_ar ? m.university.name_ar : m.university.name_en}</span> · {cityLabel(m.university.city, lang)} · {m.university.type === "public" ? tr("Public", "حكومية") : m.university.type === "private" ? tr("Private", "خاصة") : tr("Special law", "بقانون خاص")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <VerificationBadge v={m.program.verification} />
                  <button type="button" className="chip !py-1" aria-pressed={saved.includes(id)} onClick={() => toggleSave(id)}>
                    {saved.includes(id) ? `★ ${tr("Saved", "محفوظ")}` : `☆ ${tr("Save", "احفظ")}`}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 border-t border-line pt-4 md:grid-cols-[1fr_1fr_auto] md:gap-6">
                <Eligibility m={m} />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">{tr("Fit for you", "مدى الملاءمة")}</p>
                  <FitMeter fit={m.suitability} coverage={m.coverage} />
                  <p className="mt-1 text-xs text-muted">{field ? (lang === "ar" ? field.name_ar : field.name_en) : m.program.field}</p>
                  <p className="text-xs text-muted">{tr("Not a chance of admission.", "ليست فرصة قبول.")}</p>
                </div>
                <div className="md:text-end">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">{tr("Tuition estimate", "تقدير الرسوم")}</p>
                  {m.cost.per_year_jod != null ? (
                    <p className="mt-1"><span className="text-lg font-bold text-teal">~{m.cost.per_year_jod.toLocaleString()} JOD</span><span className="text-sm text-muted">/{tr("yr", "سنة")}</span></p>
                  ) : <p className="mt-1 max-w-[14rem] text-sm text-muted md:ms-auto">{tr("Information not currently verified. Please check the university’s official website.", "المعلومة غير موثّقة حالياً. يُرجى مراجعة الموقع الرسمي للجامعة.")}</p>}
                  {m.cost.within_budget === false && <p className="text-xs font-semibold text-bad">{tr("Above your budget", "أعلى من ميزانيتك")}</p>}
                  {m.cost.per_year_jod != null && <p className="text-xs text-muted">{m.cost.extra_fees_jod != null ? tr("incl. other fees", "شاملة الرسوم الأخرى") : tr("tuition only", "رسوم الساعات فقط")}{` · ${m.cost.fee_year ? `${tr("fees", "رسوم")} ${m.cost.fee_year}` : tr("fee year not stated", "سنة الرسوم غير مذكورة")}`}{m.cost.checked_at ? ` · ${tr("checked", "تحقق")} ${m.cost.checked_at}` : ""}</p>}
                </div>
              </div>

              {(m.strengths.length > 0 || m.trade_offs.length > 0) && (
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ok">{tr("Why it fits", "لماذا يناسبك")}</h3>
                    <ul className="mt-1 space-y-1">{m.strengths.slice(0, 2).map((r, i) => <li key={i} className="flex gap-2"><span aria-hidden="true" className="text-ok">+</span>{lang === "ar" ? r.ar : r.en}</li>)}
                      {m.strengths.length === 0 && <li className="text-muted">{tr("No strong match on what you told us.", "لا تطابق قوياً مع ما أخبرتنا به.")}</li>}</ul>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-warn">{tr("Trade-offs", "مقايضات")}</h3>
                    <ul className="mt-1 space-y-1">{m.trade_offs.slice(0, 2).map((r, i) => <li key={i} className="flex gap-2"><span aria-hidden="true" className="text-warn">−</span>{lang === "ar" ? r.ar : r.en}</li>)}
                      {m.trade_offs.length === 0 && <li className="text-muted">{tr("None found in the data we hold.", "لم نجد مقايضات في البيانات المتوفرة.")}</li>}</ul>
                  </div>
                </div>
              )}
              {m.alternatives.length > 0 && (
                <div className="mt-3 rounded-2xl bg-mist/60 p-3 text-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-teal">{tr("Alternatives to consider", "بدائل تستحق النظر")}</h3>
                  <ul className="mt-1 space-y-1">{m.alternatives.map((a) => <li key={a.program_id + a.kind}><a className="underline" href={`#prog-${a.program_id}`} onClick={() => { setOnlyInterests(false); setOnlyEligible(false); setOnlyBudget(false); setShowAll(true); }}>{lang === "ar" ? a.ar : a.en}</a></li>)}</ul>
                </div>
              )}
              {m.missing_data.length > 0 && (
                <p className="mt-3 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 rounded-xl bg-ivory px-3 py-2 text-xs text-muted" aria-label={tr("Missing data", "بيانات ناقصة")}>
                  <span className="font-semibold text-warn">{tr("Not yet verified", "غير موثّق بعد")}:</span>
                  {m.missing_data.map((x, i) => <span key={x}>{missingLabel(x, lang)}{i < m.missing_data.length - 1 ? (lang === "ar" ? "،" : ",") : ""}</span>)}
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
                      <tfoot><tr><td className="pt-2 font-bold text-teal">{tr("Match on what we know", "التوافق فيما نعرفه")}</td><td /><td className="pt-2 text-end font-bold text-teal">{m.suitability}</td></tr></tfoot>
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
      {!showAll && shown.length > PAGE && <button type="button" className="btn-secondary mt-4" onClick={() => setShowAll(true)}>{tr(`Show ${shown.length - PAGE} more`, `اعرض ${shown.length - PAGE} أخرى`)}</button>}

      <section className="mt-12 rounded-[1.25rem] bg-teal p-8 text-ivory">
        <p className="eyebrow !text-sand">{tr("Next · Your experience", "الجايّة · خبراتك")}</p>
        <h2 className="mt-2 text-2xl font-bold">{tr("Your average is only part of the picture.", "معدّلك جزء من القصة، مش كلها.")}</h2>
        <p className="mt-2 max-w-2xl text-mist">{tr("Turn projects and volunteering into skills, and find scholarships worth checking.", "حوّل مشاريعك وتطوّعك لمهارات، ودوّر على منح بتستاهل.")}</p>
        <Link href="/empower" className="btn mt-6 bg-sand text-teal-900 hover:bg-sand-100">{tr("Add my experience", "ضيف تجاربك")}</Link>
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
    "newer-minimum-reported": { cls: "bg-warn-100 text-warn", en: "Check: newer minimum reported", ar: "تحقّق: حد أدنى أحدث مُعلن" },
    "missing-student-average": { cls: "bg-mist text-muted", en: "Add your average to check", ar: "أضف معدلك للتحقق" },
  }[e.status];
  const detail = e.status === "meets-published-minimum" || e.status === "below-published-minimum"
    ? tr(`Your ${profile.tawjihi_avg} vs. ${e.published_min} published${e.year ? ` (${e.year}${e.track ? `, ${e.track}` : ""})` : ""}.`, `معدلك ${profile.tawjihi_avg} مقابل ${e.published_min} المنشور${e.year ? ` (${e.year})` : ""}.`)
    : e.status === "minimum-not-verified" || e.status === "conflicting-sources" ? tr("Check the official admission list.", "تحقق من قوائم القبول الرسمية.") : "";
  const rule = e.national_rule ? tr(`National minimum ${e.national_rule.min_avg} from ${e.national_rule.from_year} (reported decision).`, `حد أدنى وطني ${e.national_rule.min_avg} بدءاً من ${e.national_rule.from_year} (قرار مُعلن).`) : "";
  const cut = e.last_cutoff ? tr(`Past competitive cut-off: ${e.last_cutoff.value} (${e.last_cutoff.year}), history only.`, `معدل القبول التنافسي السابق: ${e.last_cutoff.value} (${e.last_cutoff.year})، للاطلاع فقط.`) : "";
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{tr("Admission check (rules)", "فحص القبول (قواعد)")}</p>
      <span className={`mt-1.5 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${cfg.cls}`}>{tr(cfg.en, cfg.ar)}</span>
      {detail && <p className="mt-1.5 text-xs text-muted">{detail}</p>}
      {(e.status === "meets-published-minimum" || e.status === "below-published-minimum") && <p className="text-xs text-muted">{tr("Minimum to apply, not the competitive cut-off.", "الحد الأدنى للتقديم، لا معدل القبول التنافسي.")}</p>}
      {rule && <p className="mt-1 text-xs text-muted">{rule} <a href={e.national_rule!.source_url} target="_blank" rel="noreferrer" className="underline">{tr("Source", "المصدر")}</a></p>}
      {cut && <p className="mt-1 text-xs text-muted">{cut}</p>}
    </div>
  );
}

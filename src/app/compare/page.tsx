"use client";
import Link from "next/link";
import { cityLabel, missingLabel } from "@/lib/i18n";
import { FIELD_BY_ID, TOPIC_BY_ID } from "@/lib/data/taxonomy";
import { studentTopics } from "@/lib/engines/programs";
import { useEffect, useState } from "react";
import { useBridge } from "@/components/ProfileProvider";
import { Sources, VerificationBadge } from "@/components/Badges";
import type { ProgramMatch } from "@/lib/engines/programs";

export default function Compare() {
  const { profile, setProfile, tr, lang, hydrated } = useBridge();
  const [matches, setMatches] = useState<ProgramMatch[] | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const saved = profile.saved_programs ?? [];
  const [ai, setAi] = useState<{ text: string; mode: "ai" | "offline" } | "loading" | null>(null);
  async function compareAI(ids: string[]) {
    setAi("loading");
    try {
      const r = await fetch("/api/ai/compare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile, program_ids: ids }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setAi(d);
    } catch (e) { setAi({ text: String((e as Error).message), mode: "offline" }); }
  }

  useEffect(() => {
    if (!hydrated) return;
    fetch("/api/match/programs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile }) })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); }).then((d) => { setMatches(d.matches ?? []); setLoadErr(false); }).catch(() => { setMatches([]); setLoadErr(true); });
  }, [hydrated, profile]);

  const rows = (matches ?? []).filter((m) => saved.includes(m.program.id)).slice(0, 4);
  const elig = (s: string) => ({
    "meets-published-minimum": tr("Meets minimum to apply", "يحقق الحد الأدنى للتقديم"),
    "below-published-minimum": tr("Below minimum to apply", "أقل من الحد الأدنى"),
    "stream-mismatch": tr("Stream not eligible", "الفرع غير مؤهل"),
    "minimum-not-verified": tr("Unknown: minimum not verified", "غير معروف: الحد الأدنى غير موثّق"),
    "newer-minimum-reported": tr("Check: newer minimum reported", "تحقّق: حد أدنى أحدث مُعلن"),
    "conflicting-sources": tr("Unknown: sources disagree", "غير معروف: المصادر مختلفة"),
    "missing-student-average": tr("Add your average", "أضف معدلك"),
  } as Record<string, string>)[s];
  const dash = <span className="text-warn">{tr("Not verified", "غير موثّق")}</span>;
  // Curriculum: topics read from each published study plan. "Only here" = no other compared program's plan covers it.
  const mine = studentTopics(profile);
  const topicCount = new Map<string, number>();
  for (const m of rows) for (const t of new Set(m.program.curriculum_topics ?? [])) topicCount.set(t, (topicCount.get(t) ?? 0) + 1);
  const topicName = (t: string) => (lang === "ar" ? TOPIC_BY_ID[t]?.name_ar : TOPIC_BY_ID[t]?.name_en) ?? t;
  const notRead = <span className="text-warn">{tr("Study plan not read yet", "لم تُقرأ الخطة الدراسية بعد")}</span>;
  const curriculum = (m: ProgramMatch) => {
    const ts = m.program.curriculum_topics ?? [];
    if (!ts.length) return notRead;
    return (
      <ul className="flex flex-wrap gap-1.5">
        {ts.map((t) => {
          const only = rows.length > 1 && topicCount.get(t) === 1;
          const liked = mine.has(t);
          return (
            <li key={t} className={`rounded-full border px-2 py-0.5 text-xs ${liked ? "border-sage bg-sage-100 font-semibold text-teal" : "border-line bg-ivory text-ink"}`}>
              {liked && <span aria-hidden="true">✓ </span>}{topicName(t)}{only && <span className="ms-1 text-[0.65rem] font-bold uppercase tracking-wide text-sand-700">{tr("only here", "هنا فقط")}</span>}
            </li>
          );
        })}
      </ul>
    );
  };
  const courses = (m: ProgramMatch) => {
    const cs = m.program.key_courses ?? [];
    if (!cs.length) return m.program.study_plan_url ? <span className="text-muted">{tr("Plan linked but not read automatically; open it below.", "الخطة مرفقة لكن لم تُقرأ آلياً؛ افتحها أدناه.")}</span> : notRead;
    return (
      <>
        <ul className="list-disc space-y-0.5 ps-4 text-xs">{cs.slice(0, 8).map((c) => <li key={c}>{c}</li>)}</ul>
        {cs.length > 8 && (
          <details className="mt-1 text-xs"><summary className="cursor-pointer text-teal">{tr(`${cs.length - 8} more`, `${cs.length - 8} أخرى`)}</summary>
            <ul className="mt-1 list-disc space-y-0.5 ps-4">{cs.slice(8).map((c) => <li key={c}>{c}</li>)}</ul></details>
        )}
        <span className="mt-1 block text-[0.7rem] text-muted">{tr("As printed in the study plan", "كما وردت في الخطة الدراسية")}{m.program.plan_year ? ` (${m.program.plan_year})` : ""}</span>
      </>
    );
  };
  const rankings = (m: ProgramMatch) => {
    const rs = m.university.rankings ?? [];
    if (!rs.length) return <span className="text-muted">{tr("Not listed in the QS or THE editions we checked", "غير مدرجة في إصدارات QS أو THE التي راجعناها")}</span>;
    const year = (r: { ranking: string }) => Number(r.ranking.match(/\d{4}/)?.[0] ?? 0);
    const sorted = [...rs].sort((a, b) => year(b) - year(a) || Number(!!b.subject) - Number(!!a.subject));
    return (
      <ul className="space-y-1 text-xs">
        {sorted.slice(0, 4).map((r, i) => (
          <li key={i}><strong className="text-ink">{r.rank}</strong> <a className="text-muted underline decoration-line underline-offset-2 hover:text-teal" href={r.source_url} target="_blank" rel="noreferrer">{r.ranking}{r.subject ? ` · ${r.subject}` : ""}</a>{r.source_kind !== "ranking publisher" && <span className="text-muted"> ({r.source_kind === "news" ? tr("news report", "خبر صحفي") : tr("university's own announcement", "إعلان الجامعة")})</span>}</li>
        ))}
      </ul>
    );
  };
  const lines: [string, (m: ProgramMatch) => React.ReactNode][] = [
    [tr("University", "الجامعة"), (m) => `${lang === "ar" && m.university.name_ar ? m.university.name_ar : m.university.name_en}`],
    [tr("City · type", "المدينة · النوع"), (m) => `${cityLabel(m.university.city, lang)} · ${m.university.type === "public" ? tr("Public", "حكومية") : m.university.type === "private" ? tr("Private", "خاصة") : tr("Special law", "بقانون خاص")}`],
    [tr("Fit for you", "الملاءمة"), (m) => <><strong className="text-teal">{m.suitability}/100</strong><span className={`block text-xs ${m.coverage < 0.75 ? "text-warn" : "text-muted"}`}>{tr(`information for ${Math.round(m.coverage * 100)}% of your priorities`, `معلومات عن ${Math.round(m.coverage * 100)}% من أولوياتك`)}</span></>],
    [tr("Admission check", "فحص القبول"), (m) => `${elig(m.eligibility.status)}${m.eligibility.published_min != null ? ` (${m.eligibility.published_min}${m.eligibility.year ? `, ${m.eligibility.year}` : ""})` : ""}`],
    [tr("Fee per credit hour", "رسوم الساعة"), (m) => (m.program.tuition_jod_per_credit_hour != null ? `${m.program.tuition_jod_per_credit_hour} JOD${m.program.tuition_track ? ` (${m.program.tuition_track})` : ""}` : dash)],
    [tr("Credit hours", "الساعات المعتمدة"), (m) => m.program.credit_hours ?? dash],
    [tr("Total tuition", "إجمالي الرسوم"), (m) => (m.cost.total_tuition_jod != null ? `${m.cost.total_tuition_jod.toLocaleString()} JOD` : dash)],
    [tr("Per year (approx.)", "سنوياً (تقريباً)"), (m) => (m.cost.per_year_jod != null ? <span className={m.cost.within_budget === false ? "font-semibold text-bad" : ""}>{m.cost.per_year_jod.toLocaleString()} JOD</span> : dash)],
    [tr("Other mandatory fees", "رسوم إلزامية أخرى"), (m) => (m.cost.extra_fees_jod != null ? `${m.cost.extra_fees_jod.toLocaleString()} JOD` : dash)],
    [tr("Strengths", "نقاط القوة"), (m) => <ul className="space-y-1">{m.strengths.slice(0, 4).map((r, i) => <li key={i}>+ {lang === "ar" ? r.ar : r.en}</li>)}</ul>],
    [tr("Trade-offs", "المقايضات"), (m) => <ul className="space-y-1">{m.trade_offs.slice(0, 4).map((r, i) => <li key={i}>− {lang === "ar" ? r.ar : r.en}</li>)}{m.trade_offs.length === 0 && <li className="text-muted">{tr("None found", "لا يوجد")}</li>}</ul>],
    [tr("Practical training", "التدريب العملي"), (m) => m.program.internship_note ?? dash],
    [tr("What you'd study", "ماذا ستدرس"), curriculum],
    [tr("Key courses", "مواد أساسية"), courses],
    [tr("Study plan", "الخطة الدراسية"), (m) => (m.program.study_plan_url ? <a className="underline" href={m.program.study_plan_url} target="_blank" rel="noreferrer">{tr("Open", "افتح")} ↗</a> : dash)],
    [tr("Published rankings", "التصنيفات المنشورة"), rankings],
    [tr("Past competitive cut-off", "معدل القبول التنافسي السابق"), (m) => (m.eligibility.last_cutoff ? `${m.eligibility.last_cutoff.value} (${m.eligibility.last_cutoff.year})` : dash)],
    [tr("Missing data", "بيانات ناقصة"), (m) => (m.missing_data.length ? m.missing_data.map((x) => missingLabel(x, lang)).join(lang === "ar" ? "، " : ", ") : tr("None", "لا شيء"))],
    [tr("Data status", "حالة البيانات"), (m) => <VerificationBadge v={m.program.verification} />],
    [tr("Sources", "المصادر"), (m) => <Sources sources={m.program.sources} />],
  ];

  return (
    <div>
      <p className="eyebrow">{tr("Stage 1 · Discover", "المرحلة 1 · اكتشف")}</p>
      <h1 className="h1 mt-2">{tr("Compare saved programs", "قارن البرامج المحفوظة")}</h1>
      <p className="mt-2 text-muted">{tr("Up to four programs side by side. Blank values are not verified yet; we never estimate them.", "حتى أربعة برامج جنباً إلى جنب. القيم الفارغة غير موثّقة بعد ولا نقدّرها.")}</p>
      {!matches && <div className="card mt-6 h-48 animate-pulse bg-mist/60" aria-busy="true" />}
      {loadErr && <p role="alert" className="mt-6 rounded-xl bg-bad-100 p-4 text-bad">{tr("We couldn't reach the Bridgecom server. Check your connection and refresh.", "تعذّر الوصول إلى خادم بريدجكوم. تحقق من الاتصال وحدّث الصفحة.")}</p>}
      {matches && !loadErr && rows.length === 0 && (
        <div className="card mt-6 p-8 text-center">
          <p className="text-muted">{tr("You haven't saved any programs yet. Use ☆ Save on your matches.", "لم تحفظ أي برنامج بعد. استخدم ☆ احفظ في نتائجك.")}</p>
          <Link href="/discover/results" className="btn-primary mt-4">{tr("Go to my matches", "اذهب إلى نتائجي")}</Link>
        </div>
      )}
      {rows.length > 0 && (
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <caption className="sr-only">{tr("Program comparison", "مقارنة البرامج")}</caption>
            <thead>
              <tr className="border-b border-line">
                <td className="w-40 p-3" />
                {rows.map((m) => (
                  <th key={m.program.id} scope="col" className="p-3 text-start align-top">
                    <span className="block text-base font-bold text-teal">{(lang === "ar" ? m.program.name_ar ?? FIELD_BY_ID[m.program.field]?.name_ar ?? m.program.name_en : m.program.name_en)}</span>
                    <button className="mt-1 text-xs font-normal text-bad underline" onClick={() => setProfile((p) => ({ ...p, saved_programs: p.saved_programs.filter((x) => x !== m.program.id) }))}>{tr("Remove", "إزالة")}</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map(([label, f]) => (
                <tr key={label} className="border-b border-line align-top last:border-0">
                  <th scope="row" className="p-3 text-start text-xs font-bold uppercase tracking-wider text-muted">{label}</th>
                  {rows.map((m) => <td key={m.program.id} className="p-3">{f(m)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-line p-3 text-xs text-muted">{tr("What you'd study: topics read from each published study plan. ✓ marks a subject you said you enjoy; \"only here\" means no other program in this table covers it. Rankings are shown as published, with their source; a university missing from a ranking is not rated lower by Bridgecom.", "ماذا ستدرس: مواضيع مقروءة من الخطة الدراسية المنشورة لكل برنامج. ✓ تعني مادة قلت إنك تحبها؛ \"هنا فقط\" تعني أن لا برنامج آخر في الجدول يغطيها. التصنيفات معروضة كما نُشرت مع مصدرها، وغياب جامعة عن تصنيف لا يخفض تقييمها في بريدجكوم.")}</p>
        </div>
      )}
      {rows.length >= 2 && (
        <section className="mt-6 card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-teal">{tr("Talk me through the differences", "اشرح لي الفروق")}</h2>
            <button type="button" className="btn-secondary" disabled={ai === "loading"} onClick={() => compareAI(rows.map((m) => m.program.id))}>✦ {ai === "loading" ? tr("Writing…", "جارٍ الكتابة…") : tr("Compare in plain words", "قارن بكلمات بسيطة")}</button>
          </div>
          {ai && ai !== "loading" && (
            <div role="status" className="mt-3 rounded-2xl bg-mist p-4 text-sm">
              <p>{ai.text}</p>
              <p className="mt-2 text-xs text-muted">{ai.mode === "ai" ? tr("Written by AI from the table above; numbers checked against the data. It does not choose for you.", "كتبه الذكاء الاصطناعي من الجدول أعلاه؛ تم التحقق من الأرقام. لا يختار نيابة عنك.") : tr("Template summary (AI unavailable or its answer failed our checks).", "ملخص من قالب (الذكاء الاصطناعي غير متاح أو لم تجتز إجابته فحوصاتنا).")}</p>
            </div>
          )}
        </section>
      )}
      {saved.length > 4 && <p className="mt-3 text-sm text-muted">{tr("Showing the first four saved programs.", "يتم عرض أول أربعة برامج محفوظة.")}</p>}
    </div>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useBridge } from "@/components/ProfileProvider";
import { Sources, VerificationBadge } from "@/components/Badges";
import type { ProgramMatch } from "@/lib/engines/programs";

export default function Compare() {
  const { profile, setProfile, tr, lang, hydrated } = useBridge();
  const [matches, setMatches] = useState<ProgramMatch[] | null>(null);
  const saved = profile.saved_programs ?? [];

  useEffect(() => {
    if (!hydrated) return;
    fetch("/api/match/programs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile }) })
      .then((r) => r.json()).then((d) => setMatches(d.matches ?? [])).catch(() => setMatches([]));
  }, [hydrated, profile]);

  const rows = (matches ?? []).filter((m) => saved.includes(m.program.id)).slice(0, 4);
  const elig = (s: string) => ({
    "meets-published-minimum": tr("Meets minimum to apply", "يحقق الحد الأدنى للتقديم"),
    "below-published-minimum": tr("Below minimum to apply", "أقل من الحد الأدنى"),
    "stream-mismatch": tr("Stream not eligible", "الفرع غير مؤهل"),
    "minimum-not-verified": tr("Minimum not verified", "الحد الأدنى غير موثّق"),
    "missing-student-average": tr("Add your average", "أضف معدلك"),
  } as Record<string, string>)[s];
  const dash = <span className="text-warn">{tr("Not verified", "غير موثّق")}</span>;
  const lines: [string, (m: ProgramMatch) => React.ReactNode][] = [
    [tr("University", "الجامعة"), (m) => `${lang === "ar" && m.university.name_ar ? m.university.name_ar : m.university.name_en}`],
    [tr("City · type", "المدينة · النوع"), (m) => `${m.university.city ?? "—"} · ${m.university.type === "public" ? tr("Public", "حكومية") : tr("Private", "خاصة")}`],
    [tr("Fit for you", "الملاءمة"), (m) => <strong className="text-teal">{m.suitability}/100</strong>],
    [tr("Admission check", "فحص القبول"), (m) => `${elig(m.eligibility.status)}${m.eligibility.published_min != null ? ` (${m.eligibility.published_min}${m.eligibility.year ? `, ${m.eligibility.year}` : ""})` : ""}`],
    [tr("Fee per credit hour", "رسوم الساعة"), (m) => (m.program.tuition_jod_per_credit_hour != null ? `${m.program.tuition_jod_per_credit_hour} JOD${m.program.tuition_track ? ` (${m.program.tuition_track})` : ""}` : dash)],
    [tr("Credit hours", "الساعات المعتمدة"), (m) => m.program.credit_hours ?? dash],
    [tr("Total tuition", "إجمالي الرسوم"), (m) => (m.cost.total_tuition_jod != null ? `${m.cost.total_tuition_jod.toLocaleString()} JOD` : dash)],
    [tr("Per year (approx.)", "سنوياً (تقريباً)"), (m) => (m.cost.per_year_jod != null ? <span className={m.cost.within_budget === false ? "font-semibold text-bad" : ""}>{m.cost.per_year_jod.toLocaleString()} JOD</span> : dash)],
    [tr("Top reasons", "أبرز الأسباب"), (m) => <ul className="space-y-1">{m.reasons.filter((r) => r.weight !== 0).slice(0, 4).map((r) => <li key={r.code}>{r.weight > 0 ? "+ " : "− "}{lang === "ar" ? r.ar : r.en}</li>)}</ul>],
    [tr("Missing data", "بيانات ناقصة"), (m) => (m.missing_data.length ? m.missing_data.join(", ") : tr("None", "لا شيء"))],
    [tr("Data status", "حالة البيانات"), (m) => <VerificationBadge v={m.program.verification} />],
    [tr("Sources", "المصادر"), (m) => <Sources sources={m.program.sources} />],
  ];

  return (
    <div>
      <p className="eyebrow">{tr("Stage 1 · Discover", "المرحلة 1 · اكتشف")}</p>
      <h1 className="h1 mt-2">{tr("Compare saved programs", "قارن البرامج المحفوظة")}</h1>
      <p className="mt-2 text-muted">{tr("Up to four programs side by side. Blank values are not verified yet; we never estimate them.", "حتى أربعة برامج جنباً إلى جنب. القيم الفارغة غير موثّقة بعد ولا نقدّرها.")}</p>
      {!matches && <div className="card mt-6 h-48 animate-pulse bg-mist/60" aria-busy="true" />}
      {matches && rows.length === 0 && (
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
                    <span className="block text-base font-bold text-teal">{lang === "ar" && m.program.name_ar ? m.program.name_ar : m.program.name_en}</span>
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
        </div>
      )}
      {saved.length > 4 && <p className="mt-3 text-sm text-muted">{tr("Showing the first four saved programs.", "يتم عرض أول أربعة برامج محفوظة.")}</p>}
    </div>
  );
}

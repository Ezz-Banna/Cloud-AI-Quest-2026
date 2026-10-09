"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { datasetLabel } from "@/lib/i18n";
import { useBridge } from "@/components/ProfileProvider";
import { Sources, VerificationBadge } from "@/components/Badges";
import type { Course, Program, Scholarship, University } from "@/lib/types";
import { programCompleteness } from "@/lib/data/record-completeness";
import { ADMISSION_RULES } from "@/lib/engines/programs";
import { effectiveAvailability } from "@/lib/engines/scholarships";

type Cov = Record<string, { total: number; verified: number; partial: number; other: number; invalid: number }>;

export default function DataPage() {
  const { tr, lang } = useBridge();
  const [d, setD] = useState<{ coverage: Cov; universities: University[]; programs: Program[]; scholarships: Scholarship[]; courses: Course[] } | null>(null);

  const load = () => fetch("/api/data/coverage").then((r) => r.json()).then(setD);
  useEffect(() => { load(); }, []);

  const unis = Object.fromEntries((d?.universities ?? []).map((u) => [u.id, u]));
  return (
    <div className="space-y-10">
      <div>
        <h1 className="h1">{tr("About the data", "عن البيانات")}</h1>
        <p className="mt-2 max-w-3xl text-muted">{tr("A curated subset collected and re-checked on 9 October 2026 from public sources, not full coverage. Missing values stay blank, never estimated.", "مجموعة مختارة جُمعت ورُوجعت في 9 تشرين الأول 2026 من مصادر عامة، وليست تغطية كاملة. القيم الناقصة تبقى فارغة ولا تُقدَّر.")}</p>
        <p className="mt-2 text-sm"><Link href="/how" className="font-semibold text-teal underline underline-offset-2">{tr("What is live, simulated or planned", "ما الذي يعمل، وما المحاكى، وما المخطط")}</Link></p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label={tr("Coverage", "التغطية")}>
        {d && Object.entries(d.coverage).map(([k, v]) => (
          <div key={k} className="card p-5">
            <p className="eyebrow">{datasetLabel(k, lang)}</p>
            <p className="mt-2 text-3xl font-bold text-teal">{v.total}</p>
            <p className="text-sm text-muted">{v.verified} {tr("verified", "موثّق")} · {v.partial} {tr("partial", "جزئي")}{v.other ? ` · ${v.other} ${tr("other", "أخرى")}` : ""}{v.invalid ? ` · ${v.invalid} ${tr("rejected", "مرفوض")}` : ""}</p>
          </div>
        ))}
      </section>


      <section aria-labelledby="prog-h">
        <h2 id="prog-h" className="h2">{tr("Programs", "البرامج")}</h2>
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead><tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
              {[tr("Program", "البرنامج"), tr("University", "الجامعة"), tr("Fee/credit hr", "رسوم الساعة"), tr("Credit hrs", "الساعات"), tr("Min. avg", "الحد الأدنى"), tr("Complete", "الاكتمال"), tr("Status", "الحالة"), tr("Source", "المصدر")].map((h) => <th key={h} scope="col" className="p-3 text-start">{h}</th>)}
            </tr></thead>
            <tbody>{d?.programs.map((p) => (
              <tr key={p.id} className="border-b border-line align-top last:border-0">
                <th scope="row" className="p-3 text-start font-semibold text-teal">{p.name_en}<span className="block text-xs font-normal text-muted">{p.tuition_track ?? ""}</span></th>
                <td className="p-3">{unis[p.university_id]?.name_en ?? p.university_id}</td>
                <td className="p-3">{p.tuition_jod_per_credit_hour != null ? <>{p.tuition_jod_per_credit_hour}<span className="block text-xs text-muted">{p.tuition_year ?? tr("year not stated", "السنة غير مذكورة")}</span></> : <span className="text-muted">—</span>}</td>
                <td className="p-3">{p.credit_hours ?? <span className="text-muted">—</span>}</td>
                <td className="p-3">{p.min_admission_avg != null ? `${p.min_admission_avg}${p.min_admission_year ? ` (${p.min_admission_year})` : ""}` : <span className="text-muted">—</span>}</td>
                <td className="p-3" title={programCompleteness(p).missing.join(", ")}>{programCompleteness(p).pct}%{p.study_plan_url && <span className="block text-xs text-muted">{tr("study plan read", "قُرئت الخطة")}</span>}</td>
                <td className="p-3"><VerificationBadge v={p.verification} /></td>
                <td className="max-w-64 p-3"><Sources sources={p.sources} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>


      <section aria-labelledby="rules-h">
        <h2 id="rules-h" className="h2">{tr("National minimums", "الحدود الدنيا الوطنية")}</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">{tr("Newer national decisions can raise a university’s older published minimum. Bridgecom then shows “Check” instead of “Meets”.", "قد ترفع القرارات الوطنية الأحدث الحد الأدنى المنشور سابقاً لدى الجامعة، فيعرض بريدجكوم «تحقّق» بدل «يحقق».")}</p>
        <ul className="mt-3 space-y-2 text-sm">{ADMISSION_RULES.map((r) => (
          <li key={r.id} className="card p-4"><p>{lang === "ar" ? r.text_ar : r.text_en}</p><p className="mt-1 text-xs text-muted">{r.source_kind} · <a href={r.sources[0]?.url} target="_blank" rel="noreferrer" className="underline">{tr("Source", "المصدر")}</a></p></li>
        ))}</ul>
      </section>

      <section aria-labelledby="uni-h">
        <h2 id="uni-h" className="h2">{tr("Universities", "الجامعات")}</h2>
        <div className="card mt-4 overflow-x-auto" tabIndex={0} role="region" aria-labelledby="uni-h">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
              {[tr("University", "الجامعة"), tr("Type", "النوع"), tr("City", "المدينة"), tr("Programs here", "برامج هنا"), tr("Status", "الحالة"), tr("Source", "المصدر")].map((h) => <th key={h} scope="col" className="p-3 text-start">{h}</th>)}
            </tr></thead>
            <tbody>{d?.universities.map((u) => (
              <tr key={u.id} className="border-b border-line align-top last:border-0">
                <th scope="row" className="p-3 text-start font-semibold text-teal">{lang === "ar" && u.name_ar ? u.name_ar : u.name_en}</th>
                <td className="p-3">{u.type === "public" ? tr("Public", "حكومية") : u.type === "private" ? tr("Private", "خاصة") : tr("Special law", "بقانون خاص")}</td>
                <td className="p-3">{u.city ?? <span className="text-muted">—</span>}</td>
                <td className="p-3">{d.programs.filter((p) => p.university_id === u.id).length || <span className="text-muted">{tr("none yet", "لا يوجد بعد")}</span>}</td>
                <td className="p-3"><VerificationBadge v={u.verification} /></td>
                <td className="max-w-64 p-3"><Sources sources={u.sources} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="sch-h">
        <h2 id="sch-h" className="h2">{tr("Scholarships and support", "المنح والدعم")}</h2>
        <div className="card mt-4 overflow-x-auto" tabIndex={0} role="region" aria-labelledby="sch-h">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
              {[tr("Opportunity", "الفرصة"), tr("Applications", "التقديم"), tr("Last window", "آخر فترة"), tr("Status", "الحالة"), tr("Source", "المصدر")].map((h) => <th key={h} scope="col" className="p-3 text-start">{h}</th>)}
            </tr></thead>
            <tbody>{d?.scholarships.map((s) => { const w = effectiveAvailability(s); const a = s.availability; return (
              <tr key={s.id} className="border-b border-line align-top last:border-0">
                <th scope="row" className="p-3 text-start font-semibold text-teal">{lang === "ar" && s.name_ar ? s.name_ar : s.name_en}<span className="block text-xs font-normal text-muted">{s.provider}</span></th>
                <td className="p-3">{{ open: tr("Open now", "مفتوح"), announced: tr("Announced", "معلن"), closed: tr("Closed", "مغلق"), historical: tr("Older information", "معلومات قديمة"), unverified: tr("Dates not verified", "غير موثّقة") }[w]}</td>
                <td className="p-3">{a?.opens || a?.closes ? `${a?.opens ?? "?"} → ${a?.closes ?? "?"}` : <span className="text-muted">—</span>}{a?.academic_year && <span className="block text-xs text-muted">{a.academic_year}</span>}</td>
                <td className="p-3"><VerificationBadge v={s.verification} /></td>
                <td className="max-w-64 p-3"><Sources sources={s.sources} /></td>
              </tr>); })}</tbody>
          </table>
        </div>
      </section>

      <p className="text-sm text-muted">{tr("Data maintainers can import and correct records in the protected admin area.", "يمكن لمشرفي البيانات استيراد السجلات وتصحيحها في منطقة الإدارة المحمية.")} <a href="/admin" className="underline">{tr("Admin", "الإدارة")}</a></p>
    </div>
  );
}

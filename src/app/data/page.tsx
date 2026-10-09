"use client";
import { useEffect, useState } from "react";
import { useBridge } from "@/components/ProfileProvider";
import { Sources, VerificationBadge } from "@/components/Badges";
import type { Course, Program, Scholarship, University } from "@/lib/types";
import { programCompleteness } from "@/lib/data/record-completeness";

type Cov = Record<string, { total: number; verified: number; partial: number; other: number; invalid: number }>;

export default function DataPage() {
  const { tr } = useBridge();
  const [d, setD] = useState<{ coverage: Cov; universities: University[]; programs: Program[]; scholarships: Scholarship[]; courses: Course[] } | null>(null);
  const [status, setStatus] = useState<{ ai: boolean; model: string | null } | null>(null);

  const load = () => fetch("/api/data/coverage").then((r) => r.json()).then(setD);
  useEffect(() => { load(); fetch("/api/status").then((r) => r.json()).then(setStatus); }, []);

  const unis = Object.fromEntries((d?.universities ?? []).map((u) => [u.id, u]));
  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow">{tr("Transparency", "الشفافية")}</p>
        <h1 className="h1 mt-2">{tr("About the data", "عن البيانات")}</h1>
        <p className="mt-2 max-w-3xl text-muted">{tr("Bridgecom is designed to cover every accredited Jordanian university and program. This prototype holds a curated subset collected on 9 October 2026 from official and public sources. It is not complete coverage. Every record keeps its source and check date; missing values stay blank rather than estimated.",
          "صُمّم بريدجكوم ليغطي جميع الجامعات والبرامج الأردنية المعتمدة. يضم هذا النموذج مجموعة مختارة جُمعت في 9 تشرين الأول 2026 من مصادر رسمية وعامة، وهي ليست تغطية كاملة. يحتفظ كل سجل بمصدره وتاريخ التحقق؛ وتبقى القيم الناقصة فارغة بدلاً من تقديرها.")}</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label={tr("Coverage", "التغطية")}>
        {d && Object.entries(d.coverage).map(([k, v]) => (
          <div key={k} className="card p-5">
            <p className="eyebrow">{k}</p>
            <p className="mt-2 text-3xl font-bold text-teal">{v.total}</p>
            <p className="text-sm text-muted">{v.verified} {tr("verified", "موثّق")} · {v.partial} {tr("partial", "جزئي")}{v.other ? ` · ${v.other} ${tr("other", "أخرى")}` : ""}{v.invalid ? ` · ${v.invalid} ${tr("rejected", "مرفوض")}` : ""}</p>
          </div>
        ))}
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="h2">{tr("What is real, what is synthetic", "ما الحقيقي وما المصطنع")}</h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <li>✓ {tr("Universities, programs, fees and admission minimums: public sources, cited per record", "الجامعات والبرامج والرسوم والحدود الدنيا للقبول: مصادر عامة، موثّقة لكل سجل")}</li>
          <li>✓ {tr("Scholarships and courses: real programs and resources, linked to official pages", "المنح والدورات: برامج وموارد حقيقية، مرتبطة بصفحاتها الرسمية")}</li>
          <li>◇ {tr("Employers and job roles marked Synthetic are invented for the demo", "أصحاب العمل والأدوار المعلَّمة كمصطنعة مُختلقة لأغراض العرض")}</li>
          <li>◇ {tr("The demo student \"Lina\" is synthetic", "الطالبة التجريبية \"لينا\" شخصية مصطنعة")}</li>
          <li>✦ {tr("AI", "الذكاء الاصطناعي")}: {status ? (status.ai ? `${tr("connected", "متصل")} (${status.model})` : tr("not configured on this server, offline keyword rules in use", "غير مهيأ على هذا الخادم، تُستخدم قواعد الكلمات المفتاحية")) : "…"}</li>
          <li>⚙ {tr("Eligibility, cost, matching and gap analysis are deterministic rules, not AI", "الأهلية والكلفة والمطابقة وتحليل الفجوات قواعد حتمية وليست ذكاءً اصطناعياً")}</li>
        </ul>
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
                <td className="p-3">{p.tuition_jod_per_credit_hour ?? <span className="text-muted">—</span>}</td>
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

      <p className="text-sm text-muted">{tr("Data maintainers can import and correct records in the protected admin area.", "يمكن لمشرفي البيانات استيراد السجلات وتصحيحها في منطقة الإدارة المحمية.")} <a href="/admin" className="underline">{tr("Admin", "الإدارة")}</a></p>
    </div>
  );
}

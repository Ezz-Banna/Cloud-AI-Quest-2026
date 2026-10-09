"use client";
import Link from "next/link";
import { FIELD_BY_ID } from "@/lib/data/taxonomy";
import { useEffect, useState } from "react";
import { useBridge } from "@/components/ProfileProvider";
import { EvidenceBadge, VerificationBadge } from "@/components/Badges";
import { FitMeter } from "@/components/FitMeter";
import { completeness } from "@/lib/completeness";
import { SKILL_BY_ID } from "@/lib/data/taxonomy";
import type { ProgramMatch } from "@/lib/engines/programs";
import type { OpportunityMatch } from "@/lib/engines/scholarships";

export default function Dashboard() {
  const { profile, progress, tr, lang, hydrated } = useBridge();
  const [matches, setMatches] = useState<ProgramMatch[] | null>(null);
  const [opps, setOpps] = useState<OpportunityMatch[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const c = completeness(profile, progress.selected_role);

  useEffect(() => {
    if (!hydrated) return;
    const body = JSON.stringify({ profile });
    const h = { "Content-Type": "application/json" };
    const get = (url: string) => fetch(url, { method: "POST", headers: h, body }).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); });
    setLoadError(false);
    get("/api/match/programs").then((d) => setMatches(d.matches ?? [])).catch(() => { setMatches([]); setLoadError(true); });
    get("/api/match/opportunities").then((d) => setOpps(d.matches ?? [])).catch(() => { setOpps([]); setLoadError(true); });
  }, [hydrated, profile]);

  const name = (m: ProgramMatch) => `${(lang === "ar" ? m.program.name_ar ?? FIELD_BY_ID[m.program.field]?.name_ar ?? m.program.name_en : m.program.name_en)} · ${lang === "ar" && m.university.name_ar ? m.university.name_ar : m.university.name_en}`;
  const top = (matches ?? []).filter((m) => m.eligibility.status !== "stream-mismatch" && (profile.interests.length === 0 || profile.interests.includes(m.program.field))).slice(0, 3);
  const saved = (matches ?? []).filter((m) => (profile.saved_programs ?? []).includes(m.program.id));
  const act = progress.activity;
  const rolesCompared = new Set(act.filter((a) => a.kind === "role-compared").map((a) => a.ref)).size;
  const withWork = profile.skills.filter((s) => s.status !== "self-reported").length;
  const skillName = (id?: string) => (id ? (lang === "ar" ? SKILL_BY_ID[id]?.name_ar : SKILL_BY_ID[id]?.name_en) ?? id : "");
  // Factual labels for what was done on this device. None of them is an outcome such as admission or a job.
  const stages = [
    { n: 1, en: "Study options", ar: "خيارات الدراسة", done: progress.discover_done, href: "/discover/results",
      line: progress.discover_done ? tr(`Answers given · ${(profile.saved_programs ?? []).length} program(s) saved`, `تمت الإجابة · ${(profile.saved_programs ?? []).length} برنامج محفوظ`) : tr("Questions not answered yet", "لم تتم الإجابة بعد") },
    { n: 2, en: "Your experience", ar: "خبراتك", done: profile.skills.length > 0, href: "/empower",
      line: profile.skills.length ? tr(`${profile.skills.length} skill(s) recorded · ${withWork} with work attached`, `${profile.skills.length} مهارة مسجّلة · ${withWork} مع عمل مرفق`) : tr("No experience described yet", "لم تُوصف أي خبرة بعد") },
    { n: 3, en: "Roles", ar: "الوظائف", done: rolesCompared > 0, href: "/succeed",
      line: rolesCompared ? tr(`Compared with ${rolesCompared} role(s)`, `تمت المقارنة مع ${rolesCompared} دور`) : tr("No role compared yet", "لم تتم مقارنة أي دور بعد") },
  ];
  const ACT: Record<string, [string, string]> = {
    "role-compared": ["Compared experience with", "قارنتَ خبرتك مع"],
    "programs-saved": ["Saved a program", "حفظتَ برنامجاً"],
    "evidence-submitted": ["Attached work for", "أرفقتَ عملاً لـ"],
    "review-requested": ["Asked for a review of", "طلبتَ مراجعة"],
    "next-task-selected": ["Chose next step:", "اخترت الخطوة التالية:"],
    "requirements-confirmed": ["Confirmed requirements for", "أكّدتَ متطلبات"],
  };
  const actRef = (k: string, ref?: string) => (["evidence-submitted", "review-requested", "next-task-selected"].includes(k) ? skillName(ref) : ref ?? "");

  return (
    <div className="space-y-8">
      {loadError && <p role="alert" className="rounded-xl bg-bad-100 p-4 text-bad">{tr("We couldn't load your matches right now. Your profile is safe on this device; please refresh in a moment.", "تعذّر تحميل نتائجك الآن. ملفك محفوظ على هذا الجهاز؛ حدّث الصفحة بعد قليل.")}</p>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{profile.name ? tr(`Welcome back, ${profile.name.split(" ")[0]}`, `أهلين ${profile.name.split(" ")[0]}`) : tr("My plan", "خطتي")}</p>
          <h1 className="h1 mt-2">{tr("All your steps in one place", "كل خطواتك بمكان واحد.")}</h1>
          <p className="mt-2 text-muted">{tr("Come back to your saved options and pick up where you left off.", "ارجع لخياراتك المحفوظة وكمّل من وين وقفت.")}</p>
        </div>
        <p className="text-sm text-muted">{tr("Saved on this device only.", "محفوظة على هذا الجهاز فقط.")}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3" aria-label={tr("Your steps", "خطواتك")}>
        {stages.map((s) => (
          <Link key={s.n} href={s.href} className="card flex items-center gap-4 p-5 hover:border-sage">
            <span className={`grid size-11 place-items-center rounded-full font-bold ${s.done ? "bg-sage text-white" : "border-2 border-line text-muted"}`}>{s.done ? "✓" : s.n}</span>
            <span><span className="block font-bold text-teal">{tr(s.en, s.ar)}</span><span className="text-sm text-muted">{s.line}</span></span>
          </Link>
        ))}
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="card p-5 sm:p-6" aria-labelledby="comp-h">
          <h2 id="comp-h" className="h2">{tr("Profile completeness", "اكتمال الملف")}</h2>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-mist" role="progressbar" aria-valuenow={c.pct} aria-valuemin={0} aria-valuemax={100} aria-label={tr("Profile completeness", "اكتمال الملف")}><div className="h-full rounded-full bg-sage" style={{ width: `${c.pct}%` }} /></div>
            <span className="text-xl font-bold text-teal">{c.pct}%</span>
          </div>
          <ul className="mt-4 grid gap-1.5 text-sm sm:grid-cols-2">
            {c.items.map((i) => (
              <li key={i.id}>{i.done ? <span className="text-ok">✓ {tr(i.en, i.ar)}</span> : <Link href={i.href} className="text-muted underline underline-offset-2">○ {tr(i.en, i.ar)}</Link>}</li>
            ))}
          </ul>
        </section>

        <section className="card p-5 sm:p-6" aria-labelledby="rec-h">
          <div className="flex items-center justify-between"><h2 id="rec-h" className="h2">{tr("Top university matches", "أفضل البرامج المناسبة")}</h2><Link href="/discover/results" className="text-sm font-semibold text-sage-600 underline">{tr("All", "الكل")}</Link></div>
          {!matches && <div className="mt-4 h-24 animate-pulse rounded-2xl bg-mist/60" />}
          {matches && top.length === 0 && <p className="mt-4 text-sm text-muted">{tr("Complete Discover to see matches.", "أكمل مرحلة اكتشف لعرض النتائج.")}</p>}
          <ol className="mt-4 space-y-2">{top.map((m) => (
            <li key={m.program.id} className="flex items-center justify-between gap-3 rounded-xl bg-ivory p-3"><span className="min-w-0 truncate text-sm font-semibold text-teal">{name(m)}</span><FitMeter compact fit={m.suitability} coverage={m.coverage} /></li>
          ))}</ol>
          <h3 className="mt-5 text-sm font-bold text-teal">{tr("Saved programs", "البرامج المحفوظة")} ({saved.length})</h3>
          {saved.length === 0 ? <p className="mt-1 text-sm text-muted">{tr("None yet.", "لا يوجد بعد.")}</p> : (
            <ul className="mt-2 space-y-1 text-sm">{saved.map((m) => <li key={m.program.id}>★ {name(m)}</li>)}</ul>
          )}
          {saved.length > 1 && <Link href="/compare" className="btn-secondary mt-3 !py-1.5">{tr("Compare", "قارن")}</Link>}
        </section>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <section className="card p-5 sm:p-6" aria-labelledby="sk-h">
          <div className="flex items-center justify-between"><h2 id="sk-h" className="h2">{tr("Skills and achievements", "المهارات والإنجازات")}</h2><Link href="/empower" className="text-sm font-semibold text-sage-600 underline">{tr("Edit", "تعديل")}</Link></div>
          <p className="mt-1 text-sm text-muted">{profile.achievements.length} {tr("achievements", "إنجازات")} · {profile.skills.length} {tr("skills", "مهارات")} · {profile.completed_courses.length} {tr("courses completed", "دورات مكتملة")}</p>
          {profile.skills.length === 0 ? <p className="mt-3 rounded-xl bg-mist p-4 text-sm text-muted">{tr("No skills yet.", "لا توجد مهارات بعد.")}</p> : (
            <ul className="mt-3 flex flex-wrap gap-2">{profile.skills.map((s) => (
              <li key={s.skill_id} className="flex items-center gap-1.5 rounded-full border border-line bg-white py-1 ps-3 pe-1 text-sm">{lang === "ar" ? SKILL_BY_ID[s.skill_id]?.name_ar : SKILL_BY_ID[s.skill_id]?.name_en} <span className="text-xs text-muted">L{s.level}</span><EvidenceBadge s={s.status} /></li>
            ))}</ul>
          )}
          {progress.next_task && (
            <p className="mt-4 rounded-xl bg-sage-100 p-3 text-sm text-teal">{tr("Your chosen next step:", "خطوتك التالية المختارة:")} <Link href="/succeed" className="font-semibold underline">{skillName(progress.next_task.skill_id)}</Link></p>
          )}
          {act.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-teal">{tr("Recent activity on this device", "النشاط الأخير على هذا الجهاز")}</summary>
              <ul className="mt-2 space-y-1 text-sm text-muted">{[...act].reverse().slice(0, 8).map((a, i) => (
                <li key={i}>{tr(ACT[a.kind]?.[0] ?? a.kind, ACT[a.kind]?.[1] ?? a.kind)} {actRef(a.kind, a.ref)} <span className="text-xs">· {new Date(a.at).toLocaleDateString(lang === "ar" ? "ar" : undefined)}</span></li>
              ))}</ul>
            </details>
          )}
        </section>

        <section className="card p-5 sm:p-6" aria-labelledby="op-h">
          <h2 id="op-h" className="h2">{tr("Opportunities for you", "فرص لك")}</h2>
          {!opps && <div className="mt-4 h-24 animate-pulse rounded-2xl bg-mist/60" />}
          <ul className="mt-4 space-y-2">{opps?.filter((o) => o.status === "likely-relevant").slice(0, 4).map((o) => (
            <li key={o.item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ivory p-3 text-sm">
              <a href={o.item.url} target="_blank" rel="noreferrer" className="font-semibold text-teal underline-offset-2 hover:underline">{lang === "ar" && o.item.name_ar ? o.item.name_ar : o.item.name_en} ↗</a>
              <VerificationBadge v={o.item.verification} />
            </li>
          ))}</ul>
          {opps && !opps.some((o) => o.status === "likely-relevant") && <p className="mt-2 text-sm text-muted">{tr("No likely matches yet. Add your average and financial situation in Discover.", "لا توجد فرص مرجّحة بعد. أضف معدلك ووضعك المالي في اكتشف.")}</p>}
          <Link href="/empower" className="btn-ghost mt-3 !px-0">{tr("See all opportunities", "عرض كل الفرص")} →</Link>
        </section>
      </div>
    </div>
  );
}

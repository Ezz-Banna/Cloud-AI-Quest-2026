"use client";
import { useEffect, useState } from "react";
import { useBridge } from "./ProfileProvider";
import { EvidenceBadge, VerificationBadge } from "./Badges";
import { SKILL_BY_ID } from "@/lib/data/taxonomy";
import { isHttpUrl, mergeSkill } from "@/lib/profile-ops";
import type { EmployerRole, Level } from "@/lib/types";
import type { PathwayStep, Readiness as R } from "@/lib/engines/gap";

const STATUS = {
  met: { en: "Met with evidence", ar: "متحقق بدليل", cls: "bg-ok-100 text-ok" },
  "needs-evidence": { en: "Needs evidence", ar: "يحتاج إلى دليل", cls: "bg-warn-100 text-warn" },
  "below-level": { en: "Below required level", ar: "أقل من المستوى المطلوب", cls: "bg-bad-100 text-bad" },
  missing: { en: "Missing", ar: "غير موجود", cls: "bg-bad-100 text-bad" },
} as const;
const LV = ["—", "Basic", "Working", "Strong"];
const LV_AR = ["—", "أساسي", "عملي", "متقدم"];

export function Readiness({ role }: { role: EmployerRole }) {
  const { profile, setProfile, tr, lang, setProgress, progress, hydrated } = useBridge();
  const [data, setData] = useState<{ readiness: R; pathway: PathwayStep[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [linkFor, setLinkFor] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const skillName = (id: string) => (lang === "ar" ? SKILL_BY_ID[id]?.name_ar : SKILL_BY_ID[id]?.name_en) ?? id;
  const lv = (n: number) => (lang === "ar" ? LV_AR[n] : LV[n]);

  useEffect(() => {
    if (!hydrated) return;
    const body = role.id.startsWith("pasted-") ? { profile, role } : { profile, role_id: role.id };
    fetch("/api/readiness", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; })
      .then((d) => {
        setData(d);
        setProgress((p) => {
          const hist = p.readiness_history.filter((h) => h.role_id === role.id);
          if (hist.length && hist[hist.length - 1].pct === d.readiness.readiness_pct) return p;
          return { ...p, readiness_history: [...p.readiness_history, { role_id: role.id, pct: d.readiness.readiness_pct, at: new Date().toISOString() }].slice(-60) };
        });
      })
      .catch((e) => setErr(String(e.message ?? e)));
  }, [profile, role, hydrated, setProgress]);

  if (err) return <p role="alert" className="rounded-xl bg-bad-100 p-4 text-bad">{err}</p>;
  if (!data) return <div className="card h-64 animate-pulse bg-mist/60" aria-busy="true" />;
  const { readiness: r, pathway } = data;
  const hist = progress.readiness_history.filter((h) => h.role_id === role.id);
  const first = hist[0];

  function completeCourse(courseId: string) {
    setProfile((p) => ({ ...p, completed_courses: p.completed_courses.includes(courseId) ? p.completed_courses : [...p.completed_courses, courseId] }));
  }
  function addProof(step: PathwayStep) {
    if (!isHttpUrl(url)) return;
    setProfile((p) => mergeSkill(p, { skill_id: step.skill_id, level: step.target_level as Level, status: "evidence-attached", evidence: [{ kind: "link", value: url }] }));
    setLinkFor(null); setUrl("");
  }

  return (
    <div className="space-y-8">
      <section className="card grid gap-6 p-6 md:grid-cols-[auto_1fr]" aria-labelledby="ready-h">
        <Ring pct={r.readiness_pct} label={tr("Readiness", "الجاهزية")} />
        <div>
          <h2 id="ready-h" className="h2">{r.ready ? tr("You meet every mandatory requirement with evidence.", "تحقق جميع المتطلبات الإلزامية بأدلة.") : tr(`${r.mandatory_met} of ${r.mandatory_total} mandatory skills met with evidence`, `${r.mandatory_met} من ${r.mandatory_total} مهارات إلزامية متحققة بأدلة`)}</h2>
          <p className="mt-1 text-muted">{tr(`Preferred: ${r.preferred_met} of ${r.preferred_total}. Readiness weighs mandatory skills 80% and preferred 20%. Skills you claim without evidence count half.`, `المفضلة: ${r.preferred_met} من ${r.preferred_total}. تُحتسب الإلزامية بنسبة 80% والمفضلة 20%. المهارات المُعلنة دون دليل تُحتسب بالنصف.`)}</p>
          {first && hist.length > 1 && (
            <p className="mt-3 inline-flex rounded-full bg-ok-100 px-3 py-1 text-sm font-semibold text-ok" role="status">
              {tr(`Progress: ${first.pct}% → ${r.readiness_pct}% since ${new Date(first.at).toLocaleDateString()}`, `التقدم: ${first.pct}% ← ${r.readiness_pct}% منذ ${new Date(first.at).toLocaleDateString("ar")}`)}
            </p>
          )}
          <p className="mt-3 text-xs text-muted">{tr("This is a skills comparison to help you prepare, not a hiring decision.", "هذه مقارنة مهارات لمساعدتك على الاستعداد، وليست قرار توظيف.")}</p>
        </div>
      </section>

      <section aria-labelledby="gap-h">
        <h2 id="gap-h" className="h2">{tr("Skills gap", "فجوة المهارات")}</h2>
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">{tr("Required skills compared with your profile", "المهارات المطلوبة مقارنة بملفك")}</caption>
            <thead><tr className="border-b border-line text-start text-xs uppercase tracking-wider text-muted">
              <th scope="col" className="p-3 text-start">{tr("Skill", "المهارة")}</th>
              <th scope="col" className="p-3 text-start">{tr("Required", "المطلوب")}</th>
              <th scope="col" className="p-3 text-start">{tr("You", "أنت")}</th>
              <th scope="col" className="p-3 text-start">{tr("Status", "الحالة")}</th>
            </tr></thead>
            <tbody>
              {r.gaps.map((g) => (
                <tr key={g.requirement.skill_id} className="border-b border-line last:border-0">
                  <th scope="row" className="p-3 text-start font-semibold text-teal">{skillName(g.requirement.skill_id)}</th>
                  <td className="p-3">{lv(g.requirement.level)} · <span className={g.requirement.mandatory ? "font-semibold" : "text-muted"}>{g.requirement.mandatory ? tr("Mandatory", "إلزامي") : tr("Preferred", "مفضّل")}</span></td>
                  <td className="p-3">{g.have ? <span className="inline-flex flex-wrap items-center gap-1.5">{lv(g.have.level)} <EvidenceBadge s={g.have.status} /></span> : <span className="text-muted">—</span>}
                    {g.course_completed && g.status !== "met" && <span className="mt-1 block text-xs text-warn">{tr("Course done; add a project to show the skill", "أنهيت الدورة؛ أضف مشروعاً يُظهر المهارة")}</span>}
                  </td>
                  <td className="p-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[g.status].cls}`}>{tr(STATUS[g.status].en, STATUS[g.status].ar)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="path-h">
        <h2 id="path-h" className="h2">{tr("Your learning pathway", "مسار تعلّمك")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">{tr("Ordered so prerequisites come first. Each step pairs a course with a practical task. Finishing a course doesn't prove a skill; the task and its evidence do.", "مرتّب بحيث تأتي المتطلبات السابقة أولاً. تقترن كل خطوة بدورة ومهمة عملية. إنهاء الدورة لا يثبت المهارة؛ المهمة ودليلها يثبتانها.")}</p>
        {pathway.length === 0 && <p className="card mt-4 p-6 text-ok">{tr("Nothing left to learn for this role. Consider asking for a practical assessment.", "لا شيء متبقٍ لتعلمه لهذا الدور. فكّر في طلب تقييم عملي.")}</p>}
        <ol className="mt-4 space-y-4">
          {pathway.map((s, i) => (
            <li key={s.skill_id} className="card relative p-5 sm:p-6">
              <div className="flex flex-wrap items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-teal font-bold text-ivory">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-teal">{skillName(s.skill_id)}</h3>
                    <span className="text-sm text-muted">→ {lv(s.target_level)}</span>
                    {s.reason === "prerequisite" && <span className="rounded-full bg-sand-100 px-2.5 py-0.5 text-xs font-semibold text-sand-700">{tr("Prerequisite for", "متطلب سابق لـ")} {s.for_skills.map(skillName).join(", ")}</span>}
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[s.status].cls}`}>{tr(STATUS[s.status].en, STATUS[s.status].ar)}</span>
                  </div>

                  {s.status !== "needs-evidence" && (s.course ? (
                    <div className="mt-3 rounded-2xl bg-ivory p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <a href={s.course.url} target="_blank" rel="noreferrer" className="font-semibold text-teal underline-offset-2 hover:underline">{s.course.title} ↗</a>
                          <p className="text-xs text-muted">{s.course.provider} · {s.course.language === "ar" ? "العربية" : "English"} · {s.course.cost} · {s.course.level}{s.course.est_hours ? ` · ~${s.course.est_hours}h` : ""}{s.course.has_practical_project ? ` · ${tr("includes a project", "يتضمن مشروعاً")}` : ""}</p>
                        </div>
                        <VerificationBadge v={s.course.verification} />
                      </div>
                      {s.alternatives.length > 0 && <p className="mt-2 text-xs text-muted">{tr("Alternatives", "بدائل")}: {s.alternatives.map((a, j) => <span key={a.id}>{j > 0 && " · "}<a className="underline" href={a.url} target="_blank" rel="noreferrer">{a.title}</a></span>)}</p>}
                      <button className="btn-secondary mt-3 !py-1.5" disabled={s.course_completed || profile.completed_courses.includes(s.course.id)} onClick={() => completeCourse(s.course!.id)}>
                        {s.course_completed || profile.completed_courses.includes(s.course.id) ? `✓ ${tr("Course marked complete", "تم إنهاء الدورة")}` : tr("Mark course complete", "علّم الدورة كمكتملة")}
                      </button>
                    </div>
                  ) : <p className="mt-3 text-sm text-warn">{tr("No catalogued course for this skill yet.", "لا توجد دورة مفهرسة لهذه المهارة بعد.")}</p>)}

                  <div className="mt-3 rounded-2xl border border-dashed border-sage p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-sage-600">{tr("Prove it: practical task", "أثبتها: مهمة عملية")}</p>
                    <p className="mt-1 text-sm">{lang === "ar" ? s.practical_task_ar : s.practical_task_en}</p>
                    {linkFor === s.skill_id ? (
                      <form className="mt-2 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); addProof(s); }}>
                        <label className="sr-only" htmlFor={`p-${s.skill_id}`}>{tr("Link to your work", "رابط عملك")}</label>
                        <input id={`p-${s.skill_id}`} className="input !w-auto flex-1 !py-1.5 text-sm" type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/…" />
                        <button className="btn-primary !py-1.5">{tr("Add evidence", "أضف الدليل")}</button>
                      </form>
                    ) : (
                      <button className="mt-2 text-sm font-semibold text-sage-600 underline underline-offset-2" onClick={() => setLinkFor(s.skill_id)}>{tr("I've done this, add my link", "أنجزتها، أضف الرابط")}</button>
                    )}
                    <p className="mt-1 text-xs text-muted">{tr("Adding a link marks the skill \"evidence attached\" at this level. Bridgecom doesn't assess the work itself yet.", "إضافة رابط تعلّم المهارة \"دليل مرفق\" بهذا المستوى. لا يقيّم بريدجكوم العمل نفسه بعد.")}</p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Ring({ pct, label }: { pct: number; label: string }) {
  const c = 2 * Math.PI * 52;
  return (
    <div className="relative mx-auto size-36" role="img" aria-label={`${label}: ${pct}%`}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r="52" fill="none" stroke="#E8EFEA" strokeWidth="12" />
        <circle cx="60" cy="60" r="52" fill="none" stroke={pct >= 80 ? "#2e7d5b" : "#6F9C94"} strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center"><div><p className="text-3xl font-bold text-teal">{pct}%</p><p className="text-xs text-muted">{label}</p></div></div>
    </div>
  );
}

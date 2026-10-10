"use client";
import { useEffect, useState } from "react";
import { useBridge } from "@/components/ProfileProvider";
import Link from "next/link";
import { StepStrip } from "@/components/Visuals";
import { CandidateBoard } from "@/components/CandidateBoard";
import { AnalysisMode, ModeBadge, VerificationBadge } from "@/components/Badges";
import { RequirementReview, type Draft } from "@/components/RequirementReview";
import { SKILLS, SKILL_BY_ID } from "@/lib/data/taxonomy";
import { importanceOf, type Course, type EmployerRole, type RoleRequirement } from "@/lib/types";


export default function Employer() {
  const { tr, lang, setProgress } = useBridge();
  const [draft, setDraft] = useState<Draft[] | null>(null);
  const [roles, setRoles] = useState<EmployerRole[]>([]);
  const [roleId, setRoleId] = useState<string>("");
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [city, setCity] = useState("");
  const [about, setAbout] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [recCourses, setRecCourses] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"job" | "internship" | "project">("job");
  const [jd, setJd] = useState("");
  const [reqs, setReqs] = useState<RoleRequirement[]>([]);
  const [mode, setMode] = useState<{ mode: "ai" | "offline"; model?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const name_ = (id: string) => (lang === "ar" ? SKILL_BY_ID[id]?.name_ar : SKILL_BY_ID[id]?.name_en) ?? id;

  const netErr = () => setMsg(tr("We couldn't reach the Bridgecom server. Check your connection and refresh.", "تعذّر الوصول إلى خادم بريدجكوم. تحقق من الاتصال وحدّث الصفحة."));
  const loadRoles = () => fetch("/api/roles").then((r) => r.json()).then((d) => { setRoles(d.roles); setRoleId((x) => x || d.roles[0]?.id || ""); }).catch(netErr);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadRoles(); fetch("/api/data/coverage").then((r) => r.json()).then((d) => setCourses(d.courses ?? [])).catch(netErr); }, []);
  const relevantCourses = courses.filter((c) => c.skills.some((s) => reqs.some((q) => q.skill_id === s)));

  async function parse() {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/ai/job", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: jd }) });
    const d = await r.json(); setBusy(false);
    if (!r.ok) { setMsg(d.error); return; }
    setDraft(d.items);
    if (!title) setTitle(d.title);
    setMode({ mode: d.mode, model: d.model });
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    if (!reqs.length) { setMsg(tr("Add at least one requirement.", "أضف متطلباً واحداً على الأقل.")); return; }
    const r = await fetch("/api/roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employer_name: name, sector, city: city || undefined, about, title, kind, description: jd, requirements: reqs, recommended_course_ids: recCourses.filter((id) => relevantCourses.some((c) => c.id === id)) }) });
    const d = await r.json();
    if (!r.ok) { setMsg(d.error); return; }
    setProgress((p) => ({ ...p, role_tokens: { ...(p.role_tokens ?? {}), [d.role.id]: d.manage_token } }));
    setMsg(tr("Published to the demo database as a demo organisation. Students see it labelled Unverified; Bridgecom has not checked this organisation.", "نُشر في قاعدة البيانات التجريبية كمؤسسة تجريبية. يراه الطلبة بشارة \"غير موثّق\"؛ لم يتحقق بريدجكوم من هذه المؤسسة."));
    setReqs([]); setJd(""); setTitle(""); setRecCourses([]); loadRoles(); setRoleId(d.role.id);
  }

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow">{tr("For employers", "لأصحاب العمل")}</p>
        <h1 className="h1 mt-2">{tr("Describe the skills. Meet people who are building them.", "صِف المهارات. وتعرّف على من يبنونها.")}</h1>
        <div className="mt-4"><StepStrip label={tr("How it works for employers", "طريقة العمل لأصحاب العمل")} steps={[
          { icon: "role", text: tr("Publish a role as skills and levels", "انشر دوراً كمهارات ومستويات") },
          { icon: "step", text: tr("People compare and get a next step", "يقارن الأشخاص ويحصلون على خطوة تالية") },
          { icon: "lock", text: tr("You see only those who share with you", "ترى فقط من يشارك معك") },
        ]} /></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5 sm:p-6" aria-labelledby="pub-h">
          <h2 id="pub-h" className="h2">{tr("Publish a role", "انشر دوراً")}</h2>
          <form className="mt-4 space-y-4" onSubmit={publish}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label" htmlFor="org">{tr("Organisation", "المؤسسة")}</label><input id="org" className="input" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><label className="label" htmlFor="kind">{tr("Type", "النوع")}</label>
                <select id="kind" className="input" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
                  <option value="job">{tr("Job", "وظيفة")}</option><option value="internship">{tr("Internship", "تدريب")}</option><option value="project">{tr("Project", "مشروع")}</option>
                </select></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label" htmlFor="sector">{tr("Sector", "القطاع")}</label><input id="sector" className="input" value={sector} onChange={(e) => setSector(e.target.value)} /></div>
              <div><label className="label" htmlFor="city">{tr("City", "المدينة")}</label><input id="city" className="input" value={city} onChange={(e) => setCity(e.target.value)} /></div>
            </div>
            <div><label className="label" htmlFor="about">{tr("About the organisation", "عن المؤسسة")}</label><textarea id="about" className="input min-h-16 text-sm" value={about} onChange={(e) => setAbout(e.target.value)} /></div>
            <p className="rounded-xl bg-sand-100 p-3 text-xs text-sand-700">{tr("This portal creates demo organisations. They are always labelled Unverified; seeded examples are labelled Synthetic. Real employer verification (e.g. company registry check) is on the roadmap.", "تُنشئ هذه البوابة مؤسسات تجريبية تحمل دائماً شارة \"غير موثّق\"؛ والأمثلة المضمّنة تحمل شارة \"مصطنعة\". التحقق من أصحاب العمل الحقيقيين ضمن الخطة المستقبلية.")}</p>
            <div><label className="label" htmlFor="title">{tr("Role title", "المسمى")}</label><input id="title" className="input" required minLength={2} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><label className="label" htmlFor="jd">{tr("Job description (optional; we can read requirements from it)", "الوصف الوظيفي (اختياري؛ يمكننا قراءة المتطلبات منه)")}</label>
              <textarea id="jd" className="input min-h-28 text-sm" value={jd} onChange={(e) => setJd(e.target.value)} />
              <button type="button" className="btn-secondary mt-2 !py-1.5" disabled={busy || jd.length < 20} onClick={parse}>{busy ? tr("Reading…", "جارٍ القراءة…") : tr("Extract requirements", "استخرج المتطلبات")}</button>
              {mode && <span className="ms-2"><ModeBadge mode={mode.mode} model={mode.model} /></span>}
              <div className="mt-2"><AnalysisMode /></div>
            </div>
            {draft && <RequirementReview initial={draft} onConfirm={(items) => { setReqs(items.map(({ id: _id, ...x }) => ({ ...x, mandatory: x.importance === "required" }))); setDraft(null); }} onCancel={() => setDraft(null)} />}
            <fieldset>
              <legend className="label">{tr("Requirements (review before publishing)", "المتطلبات (راجعها قبل النشر)")}</legend>
              <ul className="space-y-2">
                {reqs.map((q, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-ivory p-2">
                    <select aria-label={tr("Skill", "المهارة")} className="input !w-auto !py-1.5 text-sm" value={q.skill_id ?? ""} onChange={(e) => setReqs(reqs.map((x, j) => (j === i ? { ...x, skill_id: e.target.value || null } : x)))}>
                      <option value="">{q.label ? `“${q.label}” · ` : ""}{tr("Not in skill list", "خارج قائمة المهارات")}</option>
                      {SKILLS.map((s) => <option key={s.id} value={s.id}>{lang === "ar" ? s.name_ar : s.name_en}</option>)}
                    </select>
                    <select aria-label={tr("Level", "المستوى")} className="input !w-auto !py-1.5 text-sm" value={q.level} onChange={(e) => setReqs(reqs.map((x, j) => (j === i ? { ...x, level: Number(e.target.value) as 1 | 2 | 3 } : x)))}>
                      <option value={1}>{tr("Basic", "أساسي")}</option><option value={2}>{tr("Working", "عملي")}</option><option value={3}>{tr("Strong", "متقدم")}</option>
                    </select>
                    <select aria-label={tr("Importance", "الأهمية")} className="input !w-auto !py-1.5 text-sm" value={importanceOf(q)} onChange={(e) => { const v = e.target.value as RoleRequirement["importance"]; setReqs(reqs.map((x, j) => (j === i ? { ...x, importance: v, mandatory: v === "required" } : x))); }}>
                      <option value="required">{tr("Required", "أساسي")}</option><option value="preferred">{tr("Preferred", "مفضّل")}</option><option value="not-required">{tr("Not required", "غير مطلوب")}</option><option value="unclear">{tr("Unclear", "غير واضح")}</option>
                    </select>
                    <button type="button" className="ms-auto text-sm text-bad" onClick={() => setReqs(reqs.filter((_, j) => j !== i))} aria-label={tr("Remove", "إزالة")}>✕</button>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn-ghost mt-2 !px-0" onClick={() => setReqs([...reqs, { skill_id: "javascript", level: 2, mandatory: true, importance: "required" }])}>+ {tr("Add requirement", "أضف متطلباً")}</button>
            </fieldset>
            <fieldset>
              <legend className="label">{tr("Recommended courses (optional)", "دورات موصى بها (اختياري)")}</legend>
              {reqs.length === 0 ? <p className="text-xs text-muted">{tr("Add requirements first; we'll list catalogue courses for those skills.", "أضف المتطلبات أولاً؛ وسنعرض الدورات المفهرسة لتلك المهارات.")}</p> : (
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-line p-2 text-sm">
                  {relevantCourses.map((c) => (
                    <li key={c.id}><label className="flex items-start gap-2"><input type="checkbox" className="mt-1 accent-teal" checked={recCourses.includes(c.id)} onChange={(e) => setRecCourses(e.target.checked ? [...recCourses, c.id] : recCourses.filter((x) => x !== c.id))} />
                      <span>{c.title} <span className="text-xs text-muted">· {c.provider} · {c.skills.map(name_).join(", ")}</span></span></label></li>
                  ))}
                </ul>
              )}
              <p className="mt-1 text-xs text-muted">{tr("Only courses from Bridgecom's catalogue, so links and titles are real. Candidates see your picks first in their pathway.", "فقط دورات من فهرس بريدجكوم لضمان صحة الروابط والعناوين. يرى المرشحون اختياراتك أولاً في مسارهم.")}</p>
            </fieldset>
            {msg && <p role="status" className="rounded-xl bg-mist p-3 text-sm text-teal">{msg}</p>}
            <button className="btn-primary">{tr("Publish role", "انشر الدور")}</button>
          </form>
        </section>

        <section className="card p-5 sm:p-6" aria-labelledby="cand-h">
          <h2 id="cand-h" className="h2">{tr("People who shared with a role", "من شاركوا مع دور")}</h2>
          <label className="label mt-4" htmlFor="role">{tr("Role", "الدور")}</label>
          <select id="role" className="input" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.title}{r.verification === "synthetic" ? ` (${tr("synthetic", "مصطنع")})` : r.verification === "unverified" ? ` (${tr("demo, unverified", "تجريبي، غير موثّق")})` : ""}</option>)}
          </select>
          {roles.find((r) => r.id === roleId) && <div className="mt-2"><VerificationBadge v={roles.find((r) => r.id === roleId)!.verification} /></div>}
          <CandidateBoard roleId={roleId} roleTitle={roles.find((r) => r.id === roleId)?.title} />
          <Link href={`/employer/candidates${roleId ? `?role=${encodeURIComponent(roleId)}` : ""}`} className="btn-ghost mt-3 !px-0">{tr("Open the full candidate screen", "افتح شاشة المرشحين كاملة")} →</Link>
          <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-xl bg-ok-100/60 p-3"><dt className="font-semibold text-ok">✓ {tr("Shown", "المعروض")}</dt><dd className="mt-0.5 text-ink">{tr("First name, skills, levels, evidence states, and only if the person ticks them: accomplishments and contact details", "الاسم الأول، المهارات، المستويات، حالات الأدلة، وفقط إن اختارها الشخص: الإنجازات وبيانات التواصل")}</dd></div>
            <div className="rounded-xl bg-mist p-3"><dt className="font-semibold text-muted">✗ {tr("Never shown", "لا يُعرض أبداً")}</dt><dd className="mt-0.5 text-ink">{tr("Grades, school, city, budget, support needs", "العلامات، المدرسة، المدينة، الميزانية، احتياجات الدعم")}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  );
}

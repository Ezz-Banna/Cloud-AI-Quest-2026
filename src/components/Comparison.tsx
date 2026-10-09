"use client";
// Shows how recorded experience compares with a role's confirmed requirements. No percentage and no verdict:
// counts of what is known, the state of each requirement, and one practical next step.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useBridge } from "./ProfileProvider";
import { EvidenceBadge, VerificationBadge } from "./Badges";
import { SKILL_BY_ID } from "@/lib/data/taxonomy";
import { comparisonInput, type Comparison as C, type ExperienceState, type PathwayStep, type RequirementCheck } from "@/lib/engines/gap";
import { isHttpUrl, mergeSkill } from "@/lib/profile-ops";
import { canRequestReview, replaceSkill, requestReview } from "@/lib/review-client";
import type { Level, RoleRequirement } from "@/lib/types";

const LV = ["—", "Basic", "Working", "Strong"];
const LV_AR = ["—", "أساسي", "عملي", "متقدم"];

export interface ComparedRole { id: string; title: string; requirements: RoleRequirement[]; seeded: boolean }

export function Comparison({ role, onEditRequirements }: { role: ComparedRole; onEditRequirements?: () => void }) {
  const { profile, setProfile, tr, lang, hydrated, logActivity, progress, setProgress } = useBridge();
  const [data, setData] = useState<{ comparison: C; pathway: PathwayStep[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [linkFor, setLinkFor] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const name = (id: string) => (lang === "ar" ? SKILL_BY_ID[id]?.name_ar : SKILL_BY_ID[id]?.name_en) ?? id;
  const lv = (n: number) => (lang === "ar" ? LV_AR[n] : LV[n]);
  const input = comparisonInput(profile);
  const key = JSON.stringify(input);
  const roleKey = `${role.id}:${JSON.stringify(role.requirements)}`;

  useEffect(() => {
    if (!hydrated) return;
    const body = role.seeded ? { profile: input, language: lang, role_id: role.id } : { profile: input, language: lang, requirements: role.requirements };
    let live = true;
    fetch("/api/readiness", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; })
      .then((d) => { if (live) { setData(d); setErr(null); logActivity("role-compared", role.title); } })
      .catch((e) => live && setErr(String(e.message ?? e)));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, roleKey, hydrated, lang]);

  if (err) return <p role="alert" className="rounded-xl bg-bad-100 p-4 text-bad">{tr("The comparison could not be made: ", "تعذّرت المقارنة: ")}{err}</p>;
  if (!data) return <div className="card h-64 animate-pulse bg-mist/60" aria-busy="true" aria-label={tr("Comparing…", "جارٍ المقارنة…")} />;
  const { comparison: c, pathway } = data;
  const next = pathway.find((s) => s.skill_id === c.next_action.skill_id) ?? pathway[0];
  const later = pathway.filter((s) => s !== next);

  function addLink(skill: string, level: Level) {
    if (!isHttpUrl(url)) { setMsg(tr("Enter a full link starting with https://", "أدخل رابطاً كاملاً يبدأ بـ https://")); return; }
    setProfile((p) => mergeSkill(p, { skill_id: skill, level, status: "evidence-attached", evidence: [{ kind: "link", value: url.trim() }] }));
    logActivity("evidence-submitted", skill);
    setLinkFor(null); setUrl("");
    setMsg(tr("Link attached. The skill now shows “Evidence attached”. Nobody has reviewed the work yet.", "عند إضافة الرابط، تظهر حالة المهارة «دليل مرفق». لم يُراجع العمل بعد."));
  }
  async function askReview(skillId: string) {
    const s = profile.skills.find((x) => x.skill_id === skillId);
    if (!s) return;
    const r = await requestReview(s);
    if (!r.ok) { setMsg(r.error); return; }
    setProfile((p) => replaceSkill(p, r.skill));
    logActivity("review-requested", skillId);
    setMsg(tr("Review requested. A Bridgecom team member will check the work against a stated rubric. This demo has no external reviewers.", "تم طلب المراجعة. سيقارن أحد أعضاء فريق بريدجكوم العمل بمعايير معلنة. لا يوجد مراجعون خارجيون في هذا العرض التجريبي."));
  }
  const choose = (s: PathwayStep) => { setProgress((p) => ({ ...p, next_task: { role_id: role.id, skill_id: s.skill_id, at: new Date().toISOString() } })); logActivity("next-task-selected", s.skill_id); };

  return (
    <div className="space-y-8">
      <section className="card p-6" aria-labelledby="cmp-h">
        <h2 id="cmp-h" className="h2">{tr("How does your experience match this role?", "كيف تتوافق خبراتك مع متطلبات هذه الوظيفة؟")}</h2>
        <Summary c={c} />
        <NextActionCard c={c} step={next} onEdit={onEditRequirements} onChoose={choose} chosen={progress.next_task?.role_id === role.id && progress.next_task.skill_id === next?.skill_id} askReview={askReview} />
        {msg && <p role="status" className="mt-3 rounded-xl bg-sage-100 p-3 text-sm text-teal">{msg}</p>}
        <p className="mt-4 text-xs text-muted">{tr("This compares what you recorded with what the posting asks for. It is not a hiring decision or a prediction.", "هذه مقارنة بين ما سجّلته وما يطلبه الإعلان. وليست قرار توظيف ولا توقّعاً.")}</p>
      </section>

      {c.checks.length > 0 && (
        <section aria-labelledby="req-h">
          <h2 id="req-h" className="h2">{tr("Each requirement", "كل متطلب على حدة")}</h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {c.checks.map((k) => (
              <CheckRow key={k.key} k={k} name={name} lv={lv}
                onAttach={() => { setLinkFor(k.skill_id); setMsg(null); }}
                attaching={linkFor === k.skill_id} url={url} setUrl={setUrl} submit={() => addLink(k.skill_id, Math.max(k.level_needed, k.level_recorded) as Level)}
                canReview={!!profile.skills.find((s) => s.skill_id === k.skill_id && canRequestReview(s))} askReview={() => askReview(k.skill_id)} />
            ))}
          </ul>
        </section>
      )}

      {(c.not_assessed.length > 0 || c.excluded.length > 0) && (
        <details className="card p-5">
          <summary className="cursor-pointer font-semibold text-teal">{tr(`Not compared (${c.not_assessed.length + c.excluded.length})`, `لم تتم مقارنتها (${c.not_assessed.length + c.excluded.length})`)}</summary>
          {c.not_assessed.length > 0 && <><p className="mt-3 text-sm font-semibold">{tr("Unclear or outside our skill list", "غير واضحة أو خارج قائمة مهاراتنا")}</p>
            <ul className="mt-1 space-y-1 text-sm text-muted">{c.not_assessed.map((r, i) => <li key={i}>{r.label ?? (r.skill_id ? name(r.skill_id) : "?")}{r.quote && <q className="ms-2 text-xs">{r.quote}</q>}</li>)}</ul></>}
          {c.excluded.length > 0 && <><p className="mt-3 text-sm font-semibold">{tr("The posting says these are not required", "يذكر الإعلان أنها غير مطلوبة")}</p>
            <ul className="mt-1 space-y-1 text-sm text-muted">{c.excluded.map((r, i) => <li key={i}>{r.label ?? (r.skill_id ? name(r.skill_id) : "?")}{r.quote && <q className="ms-2 text-xs">{r.quote}</q>}</li>)}</ul></>}
          {onEditRequirements && <button type="button" className="btn-secondary mt-4 !py-1.5" onClick={onEditRequirements}>{tr("Edit requirements", "عدّل المتطلبات")}</button>}
        </details>
      )}

      {pathway.length > 0 && (
        <section aria-labelledby="path-h">
          <h2 id="path-h" className="h2">{tr("Practice plan", "خطة التدرّب")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">{tr("Ordered so that what a task builds on comes first. A finished course is not proof of a skill; the task and the work you attach are what an employer can look at.", "مرتّبة بحيث يأتي أولاً ما تعتمد عليه المهمة. إنهاء الدورة ليس إثباتاً للمهارة؛ المهمة والعمل الذي ترفقه هما ما يمكن لصاحب العمل الاطلاع عليه.")}</p>
          {next && <ol className="mt-4"><Step s={next} n={1} name={name} lv={lv} first onAttach={() => { setLinkFor(`step:${next.skill_id}`); setMsg(null); }} attaching={linkFor === `step:${next.skill_id}`} url={url} setUrl={setUrl} submit={() => addLink(next.skill_id, next.target_level)} /></ol>}
          {later.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer font-semibold text-teal">{tr(`Later steps (${later.length})`, `الخطوات اللاحقة (${later.length})`)}</summary>
              <ol className="mt-3 space-y-4">{later.map((s, i) => <Step key={s.skill_id} s={s} n={i + 2} name={name} lv={lv} onAttach={() => { setLinkFor(`step:${s.skill_id}`); setMsg(null); }} attaching={linkFor === `step:${s.skill_id}`} url={url} setUrl={setUrl} submit={() => addLink(s.skill_id, s.target_level)} />)}</ol>
            </details>
          )}
        </section>
      )}

      {role.seeded && <ShareBox roleId={role.id} />}
    </div>
  );
}

function Summary({ c }: { c: C }) {
  const { tr } = useBridge();
  const of = (a: number, b: number) => tr(`${a} / ${b}`, `${a} من ${b}`);
  const n = c.counts;
  if (c.status === "insufficient-requirements") return <p className="mt-2 text-muted">{tr("Not enough information to compare: no confirmed requirement could be compared with a skill.", "لا تتوفر معلومات كافية للمقارنة: لا يوجد متطلب مؤكَّد يمكن مقارنته بمهارة.")}</p>;
  if (c.status === "no-experience-recorded") return <p className="mt-2 text-muted">{tr(`The role asks for ${n.required} required and ${n.preferred} preferred skills. You haven't described any experience yet, so there is nothing to compare.`, `يطلب الدور ${n.required} مهارات أساسية و${n.preferred} مهارات مفضّلة. لم تصف أي خبرة بعد، لذا لا يوجد ما نقارنه.`)}</p>;
  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-3">
      <Stat label={tr("Required: recorded at the requested level", "الأساسية: مسجّلة بالمستوى المطلوب")} value={of(n.required_recorded, n.required)} />
      <Stat label={tr("Required: with work attached", "الأساسية: مع عمل مرفق")} value={of(n.required_with_evidence, n.required)} sub={tr(`${n.required_reviewed} reviewed`, `${n.required_reviewed} روجِعت`)} />
      <Stat label={tr("Preferred: recorded", "المفضّلة: مسجّلة")} value={of(n.preferred_recorded, n.preferred)} />
    </dl>
  );
}
function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div className="rounded-2xl bg-ivory p-4"><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 text-2xl font-bold text-teal">{value}</dd>{sub && <dd className="text-xs text-muted">{sub}</dd>}</div>;
}

function NextActionCard({ c, step, onEdit, onChoose, chosen, askReview }: { c: C; step?: PathwayStep; onEdit?: () => void; onChoose: (s: PathwayStep) => void; chosen: boolean; askReview: (id: string) => void }) {
  const { tr, lang } = useBridge();
  const nm = (id?: string) => (id ? (lang === "ar" ? SKILL_BY_ID[id]?.name_ar : SKILL_BY_ID[id]?.name_en) ?? id : "");
  const a = c.next_action;
  let text = ""; let action: React.ReactNode = null;
  switch (a.kind) {
    case "confirm-requirements": text = tr("Check the requirements read from the posting, or add them yourself.", "راجع المتطلبات المقروءة من الإعلان، أو أضفها بنفسك."); action = onEdit && <button className="btn-primary" onClick={onEdit}>{tr("Review requirements", "راجع المتطلبات")}</button>; break;
    case "describe-experience": text = tr("Describe something you've done (a project, course, job or activity) and confirm the skills it shows.", "صِف شيئاً أنجزته (مشروعاً أو دورة أو عملاً أو نشاطاً) وأكّد المهارات التي يُظهرها."); action = <Link className="btn-primary" href="/empower">{tr("Describe my experience", "صِف خبرتي")}</Link>; break;
    case "learn": text = tr(`Work on ${nm(a.skill_id)}: one practical task, with a short course if you need it.`, `اعمل على ${nm(a.skill_id)}: مهمة عملية واحدة، مع دورة قصيرة إن احتجت.`); break;
    case "attach-work": text = tr(`You recorded ${nm(a.skill_id)}. Attach a link to work that shows it.`, `سجّلت ${nm(a.skill_id)}. أرفق رابطاً لعمل يُظهرها.`); break;
    case "request-review": text = tr(`Your ${nm(a.skill_id)} work is attached. You can ask for it to be reviewed against a stated rubric.`, `عملك في ${nm(a.skill_id)} مرفق. يمكنك طلب مراجعته وفق معايير معلنة.`); action = <button className="btn-primary" onClick={() => askReview(a.skill_id!)}>{tr("Ask for a review", "اطلب مراجعة")}</button>; break;
    case "clarify": text = tr(`The reviewer asked for more information about ${nm(a.skill_id)}. Read their note in Empower and add to your work.`, `طلب المراجِع معلومات إضافية حول ${nm(a.skill_id)}. اقرأ ملاحظته في «تمكَّن» وأضف إلى عملك.`); action = <Link className="btn-primary" href="/empower">{tr("Open my skills", "افتح مهاراتي")}</Link>; break;
    case "none": text = tr("Every compared requirement has work attached or is under review. Nothing else to do for this role right now.", "كل متطلب تمت مقارنته لديه عمل مرفق أو قيد المراجعة. لا شيء آخر لهذا الدور حالياً."); break;
  }
  if ((a.kind === "learn" || a.kind === "attach-work") && step) action = <button className="btn-primary" disabled={chosen} onClick={() => { onChoose(step); document.getElementById(`step-${step.skill_id}`)?.focus(); }}>{chosen ? `✓ ${tr("Chosen as my next step", "اخترتها كخطوتي التالية")}` : tr("Make this my next step", "اجعلها خطوتي التالية")}</button>;
  return (
    <div key={`${a.kind}:${a.skill_id ?? ""}`} className="bc-arrive mt-5 rounded-2xl border-2 border-sage p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-sage-600">{tr("Next step", "الخطوة التالية")}</p>
      <p className="mt-1">{text}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

const STATE: Record<ExperienceState, { en: string; ar: string }> = {
  "none-recorded": { en: "No experience recorded yet", ar: "لم تُسجَّل خبرة بعد" },
  "self-reported": { en: "Self-reported", ar: "إفادة ذاتية" },
  "evidence-attached": { en: "Evidence attached", ar: "دليل مرفق" },
  "awaiting-review": { en: "Awaiting review", ar: "بانتظار المراجعة" },
  reviewed: { en: "Reviewed against a stated rubric", ar: "روجِع وفق معايير معلنة" },
  "needs-clarification": { en: "Needs clarification", ar: "يحتاج إلى توضيح" },
};

function CheckRow({ k, name, lv, onAttach, attaching, url, setUrl, submit, canReview, askReview }: { k: RequirementCheck; name: (id: string) => string; lv: (n: number) => string; onAttach: () => void; attaching: boolean; url: string; setUrl: (s: string) => void; submit: () => void; canReview: boolean; askReview: () => void }) {
  const { tr } = useBridge();
  const title = k.requirements.length > 1 ? k.requirements.map((r) => (r.skill_id ? name(r.skill_id) : r.label)).join(tr(" or ", " أو ")) : name(k.skill_id);
  const quote = k.requirements.find((r) => r.quote)?.quote;
  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-teal">{title}</p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${k.importance === "required" ? "bg-teal/10 text-teal" : "bg-mist text-muted"}`}>{k.importance === "required" ? tr("Required", "أساسي") : tr("Preferred", "مفضّل")} · {lv(k.level_needed)}</span>
      </div>
      <p className="mt-2 text-sm">
        {k.state === "none-recorded" ? <span className="text-muted">{tr(STATE["none-recorded"].en, STATE["none-recorded"].ar)}</span> : (
          <span className="inline-flex flex-wrap items-center gap-1.5">{tr("You recorded", "سجّلت")} {lv(k.level_recorded)} <EvidenceBadge s={k.state} />
            {k.level_ok === false && <span className="text-xs text-warn">{tr("below the level asked for", "أقل من المستوى المطلوب")}</span>}</span>
        )}
      </p>
      {k.course_completed && k.state === "none-recorded" && <p className="mt-1 text-xs text-muted">{tr("You finished a related course. Describe what you did in it to record the skill.", "أنهيت دورة ذات صلة. صِف ما أنجزته فيها لتسجيل المهارة.")}</p>}
      {quote && <p className="mt-2 text-xs text-muted">{tr("From the posting:", "من الإعلان:")} <q>{quote}</q></p>}
      {(k.state === "self-reported" || k.state === "none-recorded" || k.state === "needs-clarification") && !attaching && (
        <button type="button" className="mt-2 text-sm font-semibold text-sage-600 underline underline-offset-2" onClick={onAttach}>{k.state === "none-recorded" ? tr("Already done this? Attach your work", "أنجزت هذا من قبل؟ أرفق عملك") : tr("Attach a link to your work", "أرفق رابطاً لعملك")}</button>
      )}
      {attaching && <LinkForm id={`l-${k.key}`} url={url} setUrl={setUrl} submit={submit} />}
      {canReview && <button type="button" className="mt-2 ms-3 text-sm font-semibold text-teal underline underline-offset-2" onClick={askReview}>{tr("Ask for a review", "اطلب مراجعة")}</button>}
    </li>
  );
}

function LinkForm({ id, url, setUrl, submit }: { id: string; url: string; setUrl: (s: string) => void; submit: () => void }) {
  const { tr } = useBridge();
  return (
    <form className="mt-2 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <label className="sr-only" htmlFor={id}>{tr("Link to your work", "رابط عملك")}</label>
      <input id={id} autoFocus className="input !w-auto flex-1 !py-1.5 text-sm" type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/…" />
      <button className="btn-primary !py-1.5">{tr("Attach link", "أرفق الرابط")}</button>
    </form>
  );
}

function Step({ s, n, name, lv, first, onAttach, attaching, url, setUrl, submit }: { s: PathwayStep; n: number; name: (id: string) => string; lv: (n: number) => string; first?: boolean; onAttach: () => void; attaching: boolean; url: string; setUrl: (s: string) => void; submit: () => void }) {
  const { tr, lang } = useBridge();
  const c = s.course;
  return (
    <li id={`step-${s.skill_id}`} tabIndex={-1} className={`card p-5 sm:p-6 ${first ? "ring-2 ring-sage" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-teal text-sm font-bold text-ivory">{n}</span>
        <h3 className="text-lg font-bold text-teal">{name(s.skill_id)}</h3>
        <span className="text-sm text-muted">{tr("to", "إلى")} {lv(s.target_level)}</span>
        {s.reason === "prerequisite" && <span className="rounded-full bg-sand-100 px-2.5 py-0.5 text-xs font-semibold text-sand-700">{tr("Needed first for", "مطلوبة أولاً لـ")} {s.for_skills.map(name).join(tr(", ", "، "))}</span>}
        {s.importance === "preferred" && <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs text-muted">{tr("Preferred skill", "مهارة مفضّلة")}</span>}
      </div>

      <div className="mt-3 rounded-2xl border border-dashed border-sage p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-sage-600">{s.kind === "show" ? tr("Show your work", "اعرض عملك") : tr("Practical task", "مهمة عملية")}{s.task_hours ? ` · ${tr(`about ${s.task_hours} hours (our estimate)`, `نحو ${s.task_hours} ساعات (تقديرنا)`)}` : ""}</p>
        <p className="mt-1 text-sm">{lang === "ar" ? s.practical_task_ar : s.practical_task_en}</p>
        {s.builds_on.length > 0 && <p className="mt-1 text-xs text-muted">{tr("Reuses your work from:", "يعتمد على عملك في:")} {s.builds_on.map(name).join(tr(", ", "، "))}</p>}
        {attaching ? <LinkForm id={`s-${s.skill_id}`} url={url} setUrl={setUrl} submit={submit} /> : (
          <button type="button" className="mt-2 text-sm font-semibold text-sage-600 underline underline-offset-2" onClick={onAttach}>{s.kind === "show" ? tr("Attach a link to my work", "أرفق رابطاً لعملي") : tr("Already know this? Show it instead", "تعرف هذا مسبقاً؟ اعرض عملك بدلاً من ذلك")}</button>
        )}
        <p className="mt-1 text-xs text-muted">{tr("Adding a link marks the skill “Evidence attached”. The work has not been reviewed yet.", "عند إضافة الرابط، تظهر حالة المهارة «دليل مرفق». لم يُراجع العمل بعد.")}</p>
      </div>

      {s.kind === "learn" && (c ? (
        <details className="mt-3 rounded-2xl bg-ivory p-4" open={first}>
          <summary className="cursor-pointer text-sm font-semibold text-teal">{tr("If you need to learn it first: a suggested course", "إن احتجت أن تتعلمها أولاً: دورة مقترحة")}</summary>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
            <div>
              <a href={c.url} target="_blank" rel="noreferrer" className="font-semibold text-teal underline-offset-2 hover:underline">{c.title} ↗</a>
              <p className="text-xs text-muted">{c.provider} · {c.language === "ar" ? "العربية" : "English"} · {c.cost} · {c.level}{c.has_practical_project ? ` · ${tr("includes a project", "يتضمن مشروعاً")}` : ""}</p>
              <p className="mt-1 text-xs text-muted">{c.est_hours ? tr(`Course: about ${c.est_hours} hours, stated by the provider.`, `الدورة: نحو ${c.est_hours} ساعة حسب الجهة المقدمة.`) : tr("Course length not stated by the provider.", "مدة الدورة غير محددة من الجهة المقدمة.")}{c.est_hours && s.task_hours && c.est_hours > s.task_hours * 4 ? tr(" It covers more than this task needs; use only the relevant parts.", " تغطي أكثر مما تحتاجه هذه المهمة؛ استخدم الأجزاء المتعلقة فقط.") : ""}</p>
              {c.language !== lang && <p className="mt-1 text-xs text-warn">{lang === "ar" ? "متوفرة بالإنجليزية فقط." : "Available in Arabic only."}</p>}
              {s.course_shared_with && <p className="mt-1 text-xs text-muted">{tr(`Same course as the ${name(s.course_shared_with)} step.`, `الدورة نفسها في خطوة ${name(s.course_shared_with)}.`)}</p>}
            </div>
            <span className="flex flex-wrap gap-1.5">{s.employer_recommended && <span className="rounded-full bg-teal/10 px-2.5 py-0.5 text-xs font-semibold text-teal">{tr("Suggested by the employer", "يقترحها صاحب العمل")}</span>}<VerificationBadge v={c.verification} /></span>
          </div>
          <CourseDone id={c.id} />
          {s.alternatives.length > 0 && <p className="mt-2 text-xs text-muted">{tr("Other options", "خيارات أخرى")}: {s.alternatives.map((a, j) => <span key={a.id}>{j > 0 && " · "}<a className="underline" href={a.url} target="_blank" rel="noreferrer">{a.title}</a></span>)}</p>}
        </details>
      ) : <p className="mt-3 text-sm text-muted">{tr("No course in our catalogue covers this skill yet.", "لا توجد دورة في فهرسنا تغطي هذه المهارة بعد.")}</p>)}
    </li>
  );
}

function CourseDone({ id }: { id: string }) {
  const { tr, profile, setProfile } = useBridge();
  const done = profile.completed_courses.includes(id);
  return (
    <label className="mt-2 inline-flex items-center gap-2 text-xs">
      <input type="checkbox" className="accent-teal" checked={done} onChange={(e) => setProfile((p) => ({ ...p, completed_courses: e.target.checked ? [...new Set([...p.completed_courses, id])] : p.completed_courses.filter((x) => x !== id) }))} />
      {tr("I finished this course (a course alone does not record the skill)", "أنهيت هذه الدورة (الدورة وحدها لا تسجّل المهارة)")}
    </label>
  );
}

/** Off by default. Shares only skills, levels, evidence states and completed course ids with this one role. */
function ShareBox({ roleId }: { roleId: string }) {
  const { tr, profile, progress, setProgress } = useBridge();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const share = progress.shares?.[roleId];
  const payload = { skills: profile.skills.filter((s) => s.level > 0).map((s) => ({ skill_id: s.skill_id, level: s.level, status: s.status, evidence_count: s.evidence.length })), completed_courses: profile.completed_courses };
  async function on() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/candidates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, role_id: roleId, display_name: profile.name, consent: true }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setProgress((p) => ({ ...p, shares: { ...(p.shares ?? {}), [roleId]: { id: d.id, token: d.token, at: new Date().toISOString() } } }));
    } catch (e) { setErr(String((e as Error).message)); } finally { setBusy(false); }
  }
  async function off() {
    if (!share) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/candidates?id=${encodeURIComponent(share.id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${share.token}` } });
      if (!r.ok && r.status !== 404) throw new Error((await r.json()).error);
      setProgress((p) => { const s = { ...(p.shares ?? {}) }; delete s[roleId]; return { ...p, shares: s }; });
    } catch (e) { setErr(String((e as Error).message)); } finally { setBusy(false); }
  }
  return (
    <section className="card p-5" aria-labelledby="share-h">
      <h2 id="share-h" className="font-semibold text-teal">{tr("Share with this employer (optional)", "المشاركة مع صاحب العمل هذا (اختياري)")}</h2>
      <p className="mt-1 text-sm text-muted">{tr("Off unless you turn it on. Only your skills, levels, evidence states and completed courses are shared, with this role only. No grades, city, school or needs. You can withdraw at any time.", "مغلقة ما لم تفعّلها. تُشارك فقط مهاراتك ومستوياتها وحالات أدلتها والدورات المكتملة، مع هذا الدور فقط. دون معدلات أو مدينة أو مدرسة أو احتياجات. يمكنك السحب في أي وقت.")}</p>
      {share ? (
        <div className="mt-3 flex flex-wrap items-center gap-3"><span className="text-sm text-ok">✓ {tr(`Shared on ${new Date(share.at).toLocaleDateString()}`, `تمت المشاركة في ${new Date(share.at).toLocaleDateString("ar")}`)}</span><button className="btn-secondary !py-1.5" disabled={busy} onClick={off}>{tr("Withdraw", "اسحب المشاركة")}</button></div>
      ) : <button className="btn-secondary mt-3 !py-1.5" disabled={busy || payload.skills.length === 0} onClick={on}>{tr("Share my skills with this role", "شارك مهاراتي مع هذا الدور")}</button>}
      {err && <p role="alert" className="mt-2 text-sm text-bad">{err}</p>}
    </section>
  );
}

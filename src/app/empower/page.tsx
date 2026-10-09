"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useBridge } from "@/components/ProfileProvider";
import { EvidenceBadge, ModeBadge, VerificationBadge } from "@/components/Badges";
import { SKILLS, SKILL_BY_ID } from "@/lib/data/taxonomy";
import { attachEvidence, isHttpUrl, mergeSkill } from "@/lib/profile-ops";
import type { Achievement, Level } from "@/lib/types";
import type { OpportunityMatch } from "@/lib/engines/scholarships";

interface Proposed { skill_id: string; level: number; quote: string; rationale: string; accepted: boolean }
const LEVELS = [{ v: 1, en: "Basic", ar: "أساسي" }, { v: 2, en: "Working", ar: "عملي" }, { v: 3, en: "Strong", ar: "متقدم" }];
const KINDS: { v: Achievement["kind"]; en: string; ar: string }[] = [
  { v: "project", en: "Project", ar: "مشروع" }, { v: "certificate", en: "Certificate or course", ar: "شهادة أو دورة" },
  { v: "activity", en: "Volunteering or club", ar: "تطوع أو نادٍ" }, { v: "work", en: "Work or internship", ar: "عمل أو تدريب" },
  { v: "award", en: "Competition or award", ar: "مسابقة أو جائزة" }, { v: "other", en: "Other", ar: "أخرى" },
];

export default function Empower() {
  const { profile, setProfile, tr, lang, setProgress, progress } = useBridge();
  const [kind, setKind] = useState<Achievement["kind"]>("project");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [proposal, setProposal] = useState<{ ach: Achievement; skills: Proposed[]; mode: "ai" | "offline"; model?: string; dropped: number; suggestion: string | null } | null>(null);
  const [opps, setOpps] = useState<OpportunityMatch[] | null>(null);
  const [evidenceFor, setEvidenceFor] = useState<string | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [pack, setPack] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/match/opportunities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile }) })
      .then((r) => r.json()).then((d) => setOpps(d.matches ?? [])).catch(() => setOpps([]));
  }, [profile]);

  async function analyse(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (link && !isHttpUrl(link)) { setErr(tr("The link must start with http:// or https://", "يجب أن يبدأ الرابط بـ http:// أو https://")); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/ai/skills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description: desc, links: link ? [link] : [] }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      const ach: Achievement = { id: `a-${Date.now()}`, kind, title, description: desc, links: link ? [link] : [] };
      setProposal({ ach, mode: d.mode, model: d.model, dropped: d.dropped_unsupported, suggestion: d.suggested_description,
        skills: d.skills.map((s: Proposed) => ({ ...s, accepted: true })) });
    } catch (e) { setErr(String((e as Error).message)); }
    finally { setBusy(false); }
  }

  function confirm(useSuggestion: boolean) {
    if (!proposal) return;
    const ach = { ...proposal.ach, description: useSuggestion && proposal.suggestion ? proposal.suggestion : proposal.ach.description };
    let p = { ...profile, achievements: [...profile.achievements, ach] };
    for (const s of proposal.skills.filter((x) => x.accepted)) {
      p = mergeSkill(p, {
        skill_id: s.skill_id, level: s.level as Level,
        status: ach.links.length ? "evidence-attached" : "self-reported",
        evidence: [{ kind: "quote", value: s.quote, achievement_id: ach.id }, ...ach.links.map((l) => ({ kind: "link" as const, value: l }))],
      });
    }
    setProfile(p);
    setProgress((x) => ({ ...x, empower_done: true }));
    setProposal(null); setTitle(""); setDesc(""); setLink("");
  }

  async function toggleShare(consent: boolean) {
    setShareMsg(null);
    const next = { ...profile, consent_share_with_employers: consent };
    setProfile(next);
    const r = await fetch("/api/candidates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ candidate_id: progress.candidate_id, profile: next, consent }) });
    setShareMsg(r.ok ? (consent ? tr("Shared. Employers can now see your skills and evidence status (not your average, city or needs).", "تمت المشاركة. يمكن لأصحاب العمل الآن رؤية مهاراتك وحالة أدلتها (وليس معدلك أو مدينتك أو احتياجاتك).") : tr("Sharing stopped and your snapshot was removed.", "تم إيقاف المشاركة وحذف ملخصك.")) : tr("Could not update sharing.", "تعذّر تحديث المشاركة."));
  }

  function buildPack(o: OpportunityMatch) {
    const skills = profile.skills.map((s) => `- ${SKILL_BY_ID[s.skill_id]?.name_en ?? s.skill_id}: level ${s.level}/3 (${s.status})`).join("\n");
    const achs = profile.achievements.map((a) => `- ${a.title}: ${a.description}${a.links.length ? ` [${a.links.join(", ")}]` : ""}`).join("\n");
    setPack(`Application pack draft for: ${o.item.name_en} (${o.item.provider})
Official page: ${o.item.url}

About me
- Tawjihi average: ${profile.tawjihi_avg ?? "not provided"} (${profile.stream ?? "stream not provided"})
- Interests: ${profile.interests.join(", ") || "not provided"}
- Goals: ${profile.dream_careers.join(", ") || "not provided"}

Achievements (self-reported unless evidence is linked)
${achs || "- none yet"}

Skills
${skills || "- none yet"}

Before applying, check on the official page: eligibility, deadlines, required documents.
Prepared with Bridgecom. Bridgecom does not submit applications and has no funding partners; this text is a draft for you.`);
  }

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow">{tr("Stage 2 · Empower", "المرحلة 2 · تمكَّن")}</p>
        <h1 className="h1 mt-2">{tr("Show what exams can't", "أظهر ما لا تُظهره الامتحانات")}</h1>
        <p className="mt-2 max-w-2xl text-muted">{tr("Add things you've done. AI suggests the skills they show, each with the exact words from your description. You decide what to keep. Nothing becomes \"verified\" without evidence.", "أضف ما أنجزته. يقترح الذكاء الاصطناعي المهارات التي يُظهرها، مع الكلمات نفسها من وصفك. أنت تقرر ما تحتفظ به. لا شيء يصبح \"موثّقاً\" دون دليل.")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="card p-5 sm:p-6" aria-labelledby="add-h">
          <h2 id="add-h" className="h2">{tr("Add an achievement", "أضف إنجازاً")}</h2>
          {!proposal ? (
            <form onSubmit={analyse} className="mt-4 space-y-4">
              <fieldset>
                <legend className="label">{tr("Type", "النوع")}</legend>
                <div className="flex flex-wrap gap-2">{KINDS.map((k) => <button key={k.v} type="button" className="chip" aria-pressed={kind === k.v} onClick={() => setKind(k.v)}>{lang === "ar" ? k.ar : k.en}</button>)}</div>
              </fieldset>
              <div><label className="label" htmlFor="t">{tr("Title", "العنوان")}</label><input id="t" className="input" required minLength={2} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tr("e.g. School robotics club app", "مثال: تطبيق نادي الروبوتات في المدرسة")} /></div>
              <div><label className="label" htmlFor="d">{tr("What did you actually do?", "ماذا فعلت بالضبط؟")}</label>
                <textarea id="d" className="input min-h-32" required minLength={5} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={tr("Describe your own part: tools you used, what you built, what happened.", "صف دورك أنت: الأدوات التي استخدمتها، وما بنيته، وما النتيجة.")} />
              </div>
              <div><label className="label" htmlFor="l">{tr("Evidence link (optional)", "رابط الدليل (اختياري)")}</label><input id="l" className="input" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://github.com/…" />
                <p className="mt-1 text-xs text-muted">{tr("GitHub, portfolio, certificate page, or a public LinkedIn post. Bridgecom records the link but does not check it.", "GitHub أو معرض أعمال أو صفحة شهادة أو منشور عام على LinkedIn. يسجّل بريدجكوم الرابط لكنه لا يتحقق منه.")}</p></div>
              {err && <p role="alert" className="rounded-xl bg-bad-100 p-3 text-sm text-bad">{err}</p>}
              <button className="btn-primary" disabled={busy}>{busy ? tr("Reading…", "جارٍ القراءة…") : tr("Suggest skills", "اقترح المهارات")}</button>
            </form>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2"><ModeBadge mode={proposal.mode} model={proposal.model} />
                {proposal.dropped > 0 && <span className="text-xs text-muted">{tr(`${proposal.dropped} suggestion(s) removed because they weren't supported by your text`, `تم حذف ${proposal.dropped} اقتراح لأنه غير مدعوم بنصك`)}</span>}
              </div>
              {proposal.skills.length === 0 && <p className="rounded-xl bg-mist p-4 text-sm">{tr("No specific skills found in this description. Try adding what tools you used and what you built.", "لم نجد مهارات محددة في هذا الوصف. جرّب إضافة الأدوات التي استخدمتها وما بنيته.")}</p>}
              <ul className="space-y-3">
                {proposal.skills.map((s, i) => (
                  <li key={s.skill_id} className={`rounded-2xl border p-4 ${s.accepted ? "border-sage bg-sage-100/40" : "border-line opacity-70"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-2 font-bold text-teal">
                        <input type="checkbox" className="size-4 accent-teal" checked={s.accepted} onChange={(e) => setProposal({ ...proposal, skills: proposal.skills.map((x, j) => (j === i ? { ...x, accepted: e.target.checked } : x)) })} />
                        {lang === "ar" ? SKILL_BY_ID[s.skill_id]?.name_ar : SKILL_BY_ID[s.skill_id]?.name_en}
                      </label>
                      <label className="text-sm">{tr("Level", "المستوى")}{" "}
                        <select className="rounded-lg border border-line bg-white px-2 py-1" value={s.level} onChange={(e) => setProposal({ ...proposal, skills: proposal.skills.map((x, j) => (j === i ? { ...x, level: Number(e.target.value) } : x)) })}>
                          {LEVELS.map((l) => <option key={l.v} value={l.v}>{lang === "ar" ? l.ar : l.en}</option>)}
                        </select>
                      </label>
                    </div>
                    <blockquote className="mt-2 border-s-4 border-sand ps-3 text-sm italic text-ink">“{s.quote}”</blockquote>
                    <p className="mt-1 text-xs text-muted">{s.rationale}</p>
                  </li>
                ))}
              </ul>
              {proposal.suggestion && (
                <div className="rounded-2xl bg-mist p-4 text-sm">
                  <p className="font-semibold text-teal">{tr("Suggested clearer description (uses only your facts)", "وصف أوضح مقترح (يستخدم حقائقك فقط)")}</p>
                  <p className="mt-1">{proposal.suggestion}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button className="btn-primary" onClick={() => confirm(false)}>{tr("Save with my description", "احفظ بوصفي")}</button>
                {proposal.suggestion && <button className="btn-secondary" onClick={() => confirm(true)}>{tr("Save with suggested description", "احفظ بالوصف المقترح")}</button>}
                <button className="btn-ghost" onClick={() => setProposal(null)}>{tr("Cancel", "إلغاء")}</button>
              </div>
            </div>
          )}
          <details className="mt-6 rounded-2xl bg-ivory p-4 text-sm">
            <summary className="cursor-pointer font-semibold text-teal">{tr("Importing from LinkedIn?", "الاستيراد من LinkedIn؟")}</summary>
            <p className="mt-2 text-muted">{tr("Automatic LinkedIn import needs LinkedIn's partner API approval, which this prototype does not have, and we do not scrape profiles. For now, paste the text of an experience or project you wrote yourself into the form above and add your public profile URL as the evidence link.", "يتطلب الاستيراد التلقائي من LinkedIn موافقة على واجهة الشركاء، وهي غير متوفرة لهذا النموذج، ولا نقوم بجمع بيانات الملفات آلياً. الصق حالياً نص خبرة أو مشروع كتبته بنفسك في النموذج أعلاه، وأضف رابط ملفك العام كرابط دليل.")}</p>
          </details>
        </section>

        <section className="card p-5 sm:p-6" aria-labelledby="skills-h">
          <div className="flex items-center justify-between gap-2"><h2 id="skills-h" className="h2">{tr("My skills", "مهاراتي")}</h2><span className="text-sm text-muted">{profile.skills.length}</span></div>
          {profile.skills.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-mist p-5 text-sm text-muted">{tr("No skills yet. Add an achievement to get started.", "لا توجد مهارات بعد. أضف إنجازاً للبدء.")}</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {profile.skills.map((s) => (
                <li key={s.skill_id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-teal">{lang === "ar" ? SKILL_BY_ID[s.skill_id]?.name_ar : SKILL_BY_ID[s.skill_id]?.name_en}</span>
                    <span className="flex items-center gap-2"><LevelDots level={s.level} /><EvidenceBadge s={s.status} /></span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{s.evidence.filter((e) => e.kind === "link").length} {tr("link(s)", "رابط")} · {s.evidence.filter((e) => e.kind === "quote").length} {tr("quote(s)", "اقتباس")}</p>
                  {evidenceFor === s.skill_id ? (
                    <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!isHttpUrl(evidenceUrl)) return; setProfile(attachEvidence(profile, s.skill_id, evidenceUrl)); setEvidenceFor(null); setEvidenceUrl(""); }}>
                      <label className="sr-only" htmlFor={`ev-${s.skill_id}`}>{tr("Evidence URL", "رابط الدليل")}</label>
                      <input id={`ev-${s.skill_id}`} className="input !py-1.5 text-sm" type="url" required value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://" />
                      <button className="btn-primary !py-1.5">{tr("Add", "أضف")}</button>
                    </form>
                  ) : (
                    <button className="mt-1 text-xs font-semibold text-sage-600 underline underline-offset-2" onClick={() => setEvidenceFor(s.skill_id)}>{tr("Attach evidence link", "أرفق رابط دليل")}</button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <AddSkillManually />
        </section>
      </div>

      <section aria-labelledby="opp-h">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="opp-h" className="h2">{tr("Scholarships and support worth checking", "منح ودعم يستحق التحقق منه")}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">{tr("Matched on published criteria. A match means \"worth checking\", not a promise of funding. Always confirm on the official page.", "مطابقة وفق المعايير المنشورة. المطابقة تعني \"يستحق التحقق\" وليست وعداً بالتمويل. تحقق دائماً من الصفحة الرسمية.")}</p>
          </div>
        </div>
        {!opps && <div className="card mt-4 h-24 animate-pulse bg-mist/60" />}
        {opps && opps.length === 0 && <p className="card mt-4 p-6 text-muted">{tr("No opportunity data loaded yet.", "لم يتم تحميل بيانات الفرص بعد.")}</p>}
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {opps?.filter((o) => o.status !== "not-eligible").slice(0, 8).map((o) => (
            <li key={o.item.id} className="card flex flex-col p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h3 className="font-bold text-teal">{lang === "ar" && o.item.name_ar ? o.item.name_ar : o.item.name_en}</h3><p className="text-sm text-muted">{o.item.provider} · {o.item.kind}</p></div>
                <VerificationBadge v={o.item.verification} />
              </div>
              <span className={`mt-3 self-start rounded-full px-3 py-1 text-xs font-semibold ${o.status === "likely-relevant" ? "bg-ok-100 text-ok" : "bg-warn-100 text-warn"}`}>{o.status === "likely-relevant" ? tr("Likely relevant", "مرجّح أن يناسبك") : tr("Check eligibility", "تحقق من الأهلية")}</span>
              <ul className="mt-3 flex-1 space-y-1 text-sm">{o.reasons.map((r) => <li key={r.code} className="flex gap-2"><span aria-hidden="true" className={r.weight > 0 ? "text-ok" : r.weight < 0 ? "text-bad" : "text-muted"}>{r.weight > 0 ? "+" : r.weight < 0 ? "−" : "•"}</span>{lang === "ar" ? r.ar : r.en}</li>)}</ul>
              <p className="mt-2 text-xs text-ink"><span className="font-semibold">{tr("Published eligibility", "الأهلية المنشورة")}:</span> {o.item.eligibility_text}</p>
              {o.item.coverage_text && <p className="mt-1 text-xs text-muted">{o.item.coverage_text}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={o.item.url} target="_blank" rel="noreferrer" className="btn-secondary !py-1.5">{tr("Official page", "الصفحة الرسمية")} ↗</a>
                <button className="btn-ghost !py-1.5" onClick={() => buildPack(o)}>{tr("Prepare application pack", "جهّز ملف التقديم")}</button>
              </div>
            </li>
          ))}
        </ul>
        {pack && (
          <div className="card mt-4 p-5">
            <div className="flex items-center justify-between"><h3 className="font-bold text-teal">{tr("Application pack draft", "مسودة ملف التقديم")}</h3><button className="btn-ghost" onClick={() => setPack(null)}>{tr("Close", "إغلاق")}</button></div>
            <p className="mt-1 text-sm text-muted">{tr("Bridgecom doesn't send anything or have funding partners yet. Copy this into the official application.", "لا يرسل بريدجكوم أي شيء وليس لديه شركاء تمويل بعد. انسخ هذا إلى طلب التقديم الرسمي.")}</p>
            <textarea readOnly className="input mt-3 min-h-64 font-mono text-xs" value={pack} aria-label={tr("Application pack text", "نص ملف التقديم")} />
            <button className="btn-secondary mt-2" onClick={() => navigator.clipboard?.writeText(pack)}>{tr("Copy", "نسخ")}</button>
          </div>
        )}
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="share-h">
        <h2 id="share-h" className="h2">{tr("Share with employers", "المشاركة مع أصحاب العمل")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">{tr("Off by default. If you switch it on, employers on Bridgecom see your first name, your skills, levels and evidence status. They never see your average, city, budget, or support needs. You can switch it off any time and your snapshot is deleted.", "معطّلة افتراضياً. إذا فعّلتها، يرى أصحاب العمل على بريدجكوم اسمك الأول ومهاراتك ومستوياتها وحالة أدلتها. لا يرون معدلك أو مدينتك أو ميزانيتك أو احتياجات الدعم. يمكنك إيقافها في أي وقت وسيُحذف ملخصك.")}</p>
        <label className="mt-4 inline-flex items-center gap-3">
          <input type="checkbox" role="switch" className="size-5 accent-teal" checked={profile.consent_share_with_employers} onChange={(e) => toggleShare(e.target.checked)} />
          <span className="font-semibold">{tr("Let employers see my skills profile", "اسمح لأصحاب العمل برؤية ملف مهاراتي")}</span>
        </label>
        {shareMsg && <p className="mt-2 text-sm text-teal" role="status">{shareMsg}</p>}
      </section>

      <section className="rounded-[1.25rem] bg-teal p-8 text-ivory">
        <p className="eyebrow !text-sand">{tr("Next · Succeed", "التالي · انجح")}</p>
        <h2 className="mt-2 text-2xl font-bold">{tr("See how close you are to a real role.", "اعرف كم أنت قريب من وظيفة حقيقية.")}</h2>
        <Link href="/succeed" className="btn mt-6 bg-sand text-teal-900 hover:bg-sand-100">{tr("Compare me with employer requirements", "قارنّي بمتطلبات أصحاب العمل")}</Link>
      </section>
    </div>
  );
}

function LevelDots({ level }: { level: number }) {
  return <span className="inline-flex gap-0.5" role="img" aria-label={`Level ${level} of 3`}>{[1, 2, 3].map((i) => <span key={i} className={`size-2 rounded-full ${i <= level ? "bg-teal" : "bg-line"}`} />)}</span>;
}

function AddSkillManually() {
  const { profile, setProfile, tr, lang } = useBridge();
  const [id, setId] = useState("");
  const [lvl, setLvl] = useState(1);
  return (
    <form className="mt-5 flex flex-wrap items-end gap-2 border-t border-line pt-4" onSubmit={(e) => { e.preventDefault(); if (!id) return; setProfile(mergeSkill(profile, { skill_id: id, level: lvl as Level, status: "self-reported", evidence: [] })); setId(""); }}>
      <div className="flex-1 min-w-40">
        <label className="label" htmlFor="ms">{tr("Add a skill yourself", "أضف مهارة بنفسك")}</label>
        <select id="ms" className="input" value={id} onChange={(e) => setId(e.target.value)}>
          <option value="">{tr("Choose…", "اختر…")}</option>
          {SKILLS.map((s) => <option key={s.id} value={s.id}>{lang === "ar" ? s.name_ar : s.name_en}</option>)}
        </select>
      </div>
      <select aria-label={tr("Level", "المستوى")} className="input !w-auto" value={lvl} onChange={(e) => setLvl(Number(e.target.value))}>
        {LEVELS.map((l) => <option key={l.v} value={l.v}>{lang === "ar" ? l.ar : l.en}</option>)}
      </select>
      <button className="btn-secondary">{tr("Add as self-reported", "أضف كإفادة ذاتية")}</button>
    </form>
  );
}

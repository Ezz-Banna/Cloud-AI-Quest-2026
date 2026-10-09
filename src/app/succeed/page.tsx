"use client";
import { useEffect, useState } from "react";
import { useBridge } from "@/components/ProfileProvider";
import { ModeBadge, VerificationBadge } from "@/components/Badges";
import { Readiness } from "@/components/Readiness";
import { SKILL_BY_ID } from "@/lib/data/taxonomy";
import type { Employer, EmployerRole } from "@/lib/types";

export default function Succeed() {
  const { tr, lang, progress, setProgress, profile } = useBridge();
  const [roles, setRoles] = useState<EmployerRole[] | null>(null);
  const [emps, setEmps] = useState<Employer[]>([]);
  const [pasted, setPasted] = useState<EmployerRole | null>(null);
  const [jd, setJd] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<{ mode: "ai" | "offline"; model?: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { fetch("/api/roles").then((r) => r.json()).then((d) => { setRoles(d.roles); setEmps(d.employers); }).catch(() => setRoles([])); }, []);
  const selected = pasted && progress.selected_role === pasted.id ? pasted : roles?.find((r) => r.id === progress.selected_role) ?? null;
  const select = (id: string) => { setProgress((p) => ({ ...p, selected_role: id })); setTimeout(() => document.getElementById("readiness")?.scrollIntoView({ behavior: "smooth" }), 50); };

  async function parse(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/ai/job", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: jd }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (!d.requirements.length) throw new Error(tr("No recognisable skills found in this posting.", "لم نجد مهارات معروفة في هذا الإعلان."));
      const role: EmployerRole = { id: `pasted-${Date.now()}`, employer_id: "pasted", title: d.title, kind: "job", description: jd, verification: "unverified", requirements: d.requirements.map((x: { skill_id: string; level: number; mandatory: boolean }) => ({ skill_id: x.skill_id, level: x.level, mandatory: x.mandatory })) };
      setPasted(role); setMode({ mode: d.mode, model: d.model }); select(role.id);
    } catch (e) { setErr(String((e as Error).message)); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow">{tr("Stage 3 · Succeed", "المرحلة 3 · انجح")}</p>
        <h1 className="h1 mt-2">{tr("How close are you to the job?", "كم أنت قريب من الوظيفة؟")}</h1>
        <p className="mt-2 max-w-2xl text-muted">{tr("Pick a role or paste a real posting. We compare what it asks for with the skills you've shown evidence for, then build a learning path in the right order.", "اختر دوراً أو الصق إعلان وظيفة حقيقياً. نقارن ما يطلبه بالمهارات التي قدّمت أدلة عليها، ثم نبني مسار تعلم بالترتيب الصحيح.")}</p>
        {profile.skills.length === 0 && <p className="mt-3 rounded-xl bg-sand-100 p-3 text-sm text-sand-700">{tr("Your skills profile is empty, so every skill will show as missing. Add achievements in Empower first.", "ملف مهاراتك فارغ، لذا ستظهر جميع المهارات كمفقودة. أضف إنجازاتك في مرحلة تمكَّن أولاً.")}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section aria-labelledby="roles-h">
          <h2 id="roles-h" className="h2">{tr("Open roles", "الأدوار المتاحة")}</h2>
          {!roles && <div className="card mt-4 h-40 animate-pulse bg-mist/60" />}
          <ul className="mt-4 space-y-3">
            {roles?.map((r) => {
              const emp = emps.find((e) => e.id === r.employer_id);
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => select(r.id)} aria-pressed={progress.selected_role === r.id}
                    className={`card w-full p-5 text-start transition hover:border-sage ${progress.selected_role === r.id ? "ring-2 ring-sage" : ""}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><p className="font-bold text-teal">{r.title}</p><p className="text-sm text-muted">{emp?.name ?? "—"} · {r.city ?? ""} · {r.kind}</p></div>
                      <VerificationBadge v={r.verification} />
                    </div>
                    <p className="mt-3 flex flex-wrap gap-1.5">{r.requirements.map((q) => <span key={q.skill_id} className={`rounded-full px-2.5 py-0.5 text-xs ${q.mandatory ? "bg-teal/10 font-semibold text-teal" : "bg-mist text-muted"}`}>{lang === "ar" ? SKILL_BY_ID[q.skill_id]?.name_ar : SKILL_BY_ID[q.skill_id]?.name_en}</span>)}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card h-fit p-5 sm:p-6" aria-labelledby="paste-h">
          <h2 id="paste-h" className="h2">{tr("Paste a job posting", "الصق إعلان وظيفة")}</h2>
          <p className="mt-1 text-sm text-muted">{tr("AI turns the text into skill requirements, each tied to a quote from the posting.", "يحوّل الذكاء الاصطناعي النص إلى متطلبات مهارات، كل منها مرتبط باقتباس من الإعلان.")}</p>
          <form onSubmit={parse} className="mt-4 space-y-3">
            <label htmlFor="jd" className="sr-only">{tr("Job posting text", "نص إعلان الوظيفة")}</label>
            <textarea id="jd" className="input min-h-40 text-sm" required minLength={20} value={jd} onChange={(e) => setJd(e.target.value)} placeholder={tr("Paste the requirements section here…", "الصق قسم المتطلبات هنا…")} />
            {err && <p role="alert" className="rounded-xl bg-bad-100 p-3 text-sm text-bad">{err}</p>}
            <button className="btn-primary" disabled={busy}>{busy ? tr("Reading…", "جارٍ القراءة…") : tr("Analyse posting", "حلّل الإعلان")}</button>
          </form>
          {pasted && mode && <div className="mt-3 flex items-center gap-2 text-sm"><ModeBadge mode={mode.mode} model={mode.model} /><span className="text-muted">{pasted.requirements.length} {tr("requirements found", "متطلبات")}</span></div>}
        </section>
      </div>

      <div id="readiness" className="scroll-mt-40">
        {selected ? (
          <>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted">{tr("Readiness for", "الجاهزية لـ")} <span className="text-teal">{selected.title}</span></h2>
            <Readiness role={selected} />
          </>
        ) : (
          <p className="card p-8 text-center text-muted">{tr("Choose a role above to see your skills gap and learning pathway.", "اختر دوراً أعلاه لعرض فجوة مهاراتك ومسار تعلّمك.")}</p>
        )}
      </div>
    </div>
  );
}

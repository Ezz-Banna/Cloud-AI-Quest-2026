"use client";
import { useEffect, useState } from "react";
import { cityLabel, kindLabel } from "@/lib/i18n";
import { useBridge } from "@/components/ProfileProvider";
import { AnalysisMode, ModeBadge, VerificationBadge } from "@/components/Badges";
import { Comparison, type ComparedRole } from "@/components/Comparison";
import { RequirementReview, type Draft } from "@/components/RequirementReview";
import { SKILL_BY_ID } from "@/lib/data/taxonomy";
import { StepStrip } from "@/components/Visuals";
import Link from "next/link";
import { importanceOf, type Employer, type EmployerRole } from "@/lib/types";

export default function Succeed() {
  const { tr, lang, progress, setProgress, profile, logActivity, hydrated } = useBridge();
  const [roles, setRoles] = useState<EmployerRole[] | null>(null);
  const [emps, setEmps] = useState<Employer[]>([]);
  const [jd, setJd] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<{ title: string; items: Draft[]; ignored: number; suspicious: number; mode: "ai" | "offline" | "edit"; model?: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { fetch("/api/roles").then((r) => r.json()).then((d) => { setRoles(d.roles); setEmps(d.employers); }).catch(() => { setRoles([]); setErr(tr("We couldn't reach the Bridgecom server. Check your connection and refresh.", "تعذّر الوصول إلى خادم بريدجكوم. تحقق من الاتصال وحدّث الصفحة.")); }); }, [tr]);

  const pasted = progress.pasted_role;
  const seeded = roles?.find((r) => r.id === progress.selected_role);
  const selected: ComparedRole | null = pasted && progress.selected_role === pasted.id
    ? { id: pasted.id, title: pasted.title, requirements: pasted.requirements, seeded: false }
    : seeded ? { id: seeded.id, title: seeded.title, requirements: seeded.requirements, seeded: true } : null;
  const focusResult = () => setTimeout(() => document.getElementById("result")?.focus(), 50);
  const select = (id: string) => { setReview(null); setProgress((p) => ({ ...p, selected_role: id })); focusResult(); };

  async function parse(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/ai/job", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: jd }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setReview({ title: d.title, items: d.items, ignored: d.ignored?.length ?? 0, suspicious: d.suspicious?.length ?? 0, mode: d.mode, model: d.model });
      setTimeout(() => document.getElementById("rr-h")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (e) { setErr(String((e as Error).message)); } finally { setBusy(false); }
  }
  function confirm(items: Draft[]) {
    const role: EmployerRole = {
      id: `pasted-${Date.now()}`, employer_id: "pasted", title: review?.title || tr("Pasted posting", "إعلان ملصق"), kind: "job", description: "", verification: "unverified",
      requirements: items.map(({ id: _id, ...x }) => ({ ...x, mandatory: x.importance === "required" })),
    };
    setProgress((p) => ({ ...p, pasted_role: role, selected_role: role.id }));
    logActivity("requirements-confirmed", role.title);
    setReview(null); focusResult();
  }
  const editPasted = () => {
    if (!pasted) return;
    setReview({ title: pasted.title, items: pasted.requirements.map((r, i) => ({ ...r, id: `e-${i}`, label: r.label ?? (r.skill_id ? SKILL_BY_ID[r.skill_id]?.name_en ?? r.skill_id : ""), importance: importanceOf(r), flags: r.flags ?? [] })), ignored: 0, suspicious: 0, mode: "edit" });
  };
  const chip = (q: EmployerRole["requirements"][number], i: number) => {
    const imp = importanceOf(q);
    const nm = q.skill_id ? (lang === "ar" ? SKILL_BY_ID[q.skill_id]?.name_ar : SKILL_BY_ID[q.skill_id]?.name_en) : q.label;
    return <span key={i} className={`rounded-full px-2.5 py-0.5 text-xs ${imp === "required" ? "bg-teal/10 font-semibold text-teal" : "bg-mist text-muted"}`}>{nm}{imp === "preferred" && <span className="sr-only"> ({tr("preferred", "مفضّلة")})</span>}</span>;
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="h1">{tr("Compare your experience with a role", "قارن خبرتك بدور وظيفي")}</h1>
        <div className="mt-4"><StepStrip label={tr("How it works", "طريقة العمل")} steps={[
          { icon: "role", text: tr("Pick a role or paste a posting", "اختر دوراً أو الصق إعلاناً") },
          { icon: "edit", text: tr("Check what was read", "راجع ما قُرئ") },
          { icon: "step", text: tr("Get one next step", "احصل على خطوة تالية") },
        ]} /></div>
        {hydrated && profile.skills.length === 0 && <p className="mt-3 max-w-2xl rounded-xl bg-sand-100 p-3 text-sm text-sand-700">{tr("No experience recorded yet. To compare, ", "لم تسجّل أي خبرة بعد. للمقارنة، ")}<Link href="/empower" className="font-semibold underline">{tr("describe your experience first", "صِف خبرتك أولاً")}</Link>.</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section aria-labelledby="roles-h">
          <h2 id="roles-h" className="h2">{tr("Example roles", "أدوار تجريبية")} <span className="ms-1 align-middle rounded-full bg-sand-100 px-2.5 py-0.5 text-xs font-semibold text-sand-700">◇ {tr("Synthetic", "مصطنعة")}</span></h2>
          {!roles && <div className="card mt-4 h-40 animate-pulse bg-mist/60" />}
          <ul className="mt-4 space-y-3">
            {roles?.map((r) => {
              const emp = emps.find((e) => e.id === r.employer_id);
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => select(r.id)} aria-pressed={progress.selected_role === r.id}
                    className={`card w-full p-5 text-start transition hover:border-sage ${progress.selected_role === r.id ? "ring-2 ring-sage" : ""}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><p className="font-bold text-teal">{r.title}</p><p className="text-sm text-muted">{emp?.name ?? "—"} · {cityLabel(r.city, lang)} · {kindLabel(r.kind, lang)}</p></div>
                      {r.verification !== "synthetic" && <VerificationBadge v={r.verification} />}
                    </div>
                    <p className="mt-3 flex flex-wrap gap-1.5">{r.requirements.filter((q) => importanceOf(q) !== "not-required").map(chip)}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card h-fit p-5 sm:p-6" aria-labelledby="paste-h">
          <h2 id="paste-h" className="h2">{tr("Paste a job posting", "الصق إعلان وظيفة")}</h2>
          <div className="mt-2"><AnalysisMode /></div>
          <form onSubmit={parse} className="mt-4 space-y-3">
            <label htmlFor="jd" className="sr-only">{tr("Job posting text", "نص إعلان الوظيفة")}</label>
            <textarea id="jd" dir="auto" className="input min-h-40 text-sm" required minLength={20} maxLength={8000} value={jd} onChange={(e) => setJd(e.target.value)} placeholder={tr("Paste the requirements section here, in English or Arabic…", "الصق قسم المتطلبات هنا، بالعربية أو الإنجليزية…")} />
            {err && <p role="alert" className="rounded-xl bg-bad-100 p-3 text-sm text-bad">{err}</p>}
            <button className="btn-primary" disabled={busy}>{busy ? tr("Reading…", "جارٍ القراءة…") : tr("Read the posting", "اقرأ الإعلان")}</button>
          </form>
          {pasted && !review && (
            <p className="mt-3 text-sm">
              <button type="button" className="font-semibold text-teal underline underline-offset-2" onClick={() => select(pasted.id)}>{tr("Your pasted posting", "إعلانك الملصق")}: {pasted.title}</button>
            </p>
          )}
        </section>
      </div>

      {review && (
        <div>
          {review.mode !== "edit" && <div className="mb-3"><ModeBadge mode={review.mode} model={review.model} /></div>}
          <RequirementReview key={review.title + review.items.length} initial={review.items} ignored={review.ignored} suspicious={review.suspicious} onConfirm={confirm} onCancel={() => setReview(null)} />
        </div>
      )}

      <div id="result" tabIndex={-1} className="scroll-mt-40 outline-none">
        {!review && (selected ? (
          <>
            <p className="mb-4 text-sm font-bold uppercase tracking-wider text-muted">{tr("Compared with", "مقارنة مع")} <span className="text-teal">{selected.title}</span></p>
            <Comparison role={selected} onEditRequirements={selected.seeded ? undefined : editPasted} />
          </>
        ) : (
          <p className="card p-8 text-center text-muted">{tr("Choose an example role or paste a posting to compare.", "اختر دوراً تجريبياً أو الصق إعلاناً للمقارنة.")}</p>
        ))}
      </div>
    </div>
  );
}

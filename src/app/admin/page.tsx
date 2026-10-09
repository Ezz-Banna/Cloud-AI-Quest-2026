"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useBridge } from "@/components/ProfileProvider";
import { VerificationBadge } from "@/components/Badges";
import type { EmployerRole, Verification } from "@/lib/types";
import type { AILogEntry } from "@/lib/ai/log";

type Dataset = "universities" | "programs" | "scholarships" | "courses";
interface Overview {
  coverage: Record<string, { total: number; verified: number; partial: number; other: number; invalid: number }>;
  issues: { dataset: string; id: string; issue: string }[];
  data: Record<Dataset, Record<string, unknown>[]>;
  roles: (EmployerRole & { deletable: boolean })[];
  candidates: number;
  ai_log: AILogEntry[];
}
const TABS = ["overview", "data", "provenance", "opportunities", "ai", "import"] as const;

export default function Admin() {
  const { tr } = useBridge();
  const [state, setState] = useState<"loading" | "login" | "disabled" | "ready">("loading");
  const [ov, setOv] = useState<Overview | null>(null);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("overview");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/overview");
    if (r.status === 503) return setState("disabled");
    if (r.status === 401) return setState("login");
    setOv(await r.json()); setState("ready");
  }, []);
  useEffect(() => { load(); }, [load]);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (!r.ok) { setErr((await r.json()).error); return; }
    setPw(""); load();
  }

  if (state === "loading") return <div className="card h-40 animate-pulse bg-mist/60" aria-busy="true" />;
  if (state === "disabled") return <div className="card mx-auto max-w-lg p-8"><h1 className="h2">{tr("Admin is disabled", "الإدارة معطّلة")}</h1><p className="mt-2 text-muted">{tr("Set ADMIN_PASSWORD in the server environment to enable the data management area.", "اضبط ADMIN_PASSWORD في بيئة الخادم لتفعيل منطقة إدارة البيانات.")}</p></div>;
  if (state === "login") return (
    <form onSubmit={login} className="card mx-auto max-w-sm space-y-4 p-8">
      <h1 className="h2">{tr("Admin sign in", "دخول الإدارة")}</h1>
      <div><label className="label" htmlFor="pw">{tr("Password", "كلمة المرور")}</label><input id="pw" type="password" autoComplete="current-password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} required /></div>
      {err && <p role="alert" className="rounded-xl bg-bad-100 p-3 text-sm text-bad">{err}</p>}
      <button className="btn-primary w-full">{tr("Sign in", "دخول")}</button>
    </form>
  );
  if (!ov) return null;

  const errors = ov.ai_log.filter((e) => e.error || e.dropped_by_validation > 0);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="eyebrow">{tr("Administration", "الإدارة")}</p><h1 className="h1 mt-2">{tr("Data and quality", "البيانات والجودة")}</h1></div>
        <button className="btn-secondary" onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); setState("login"); }}>{tr("Sign out", "خروج")}</button>
      </div>
      <div className="flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} className="chip" aria-pressed={tab === t} onClick={() => setTab(t)}>
          {{ overview: tr("Overview", "نظرة عامة"), data: tr("Edit records", "تعديل السجلات"), provenance: tr(`Provenance (${ov.issues.length})`, `المصادر (${ov.issues.length})`), opportunities: tr("Opportunities", "الفرص"), ai: tr(`AI review (${errors.length})`, `مراجعة الذكاء الاصطناعي (${errors.length})`), import: tr("Import", "استيراد") }[t]}
        </button>)}
      </div>

      {tab === "overview" && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(ov.coverage).map(([k, v]) => <div key={k} className="card p-5"><p className="eyebrow">{k}</p><p className="mt-2 text-3xl font-bold text-teal">{v.total}</p><p className="text-sm text-muted">{v.verified} verified · {v.partial} partial{v.invalid ? ` · ${v.invalid} rejected` : ""}</p></div>)}
          <div className="card p-5"><p className="eyebrow">{tr("Provenance issues", "مشكلات المصادر")}</p><p className="mt-2 text-3xl font-bold text-teal">{ov.issues.length}</p></div>
          <div className="card p-5"><p className="eyebrow">{tr("Roles", "الأدوار")}</p><p className="mt-2 text-3xl font-bold text-teal">{ov.roles.length}</p></div>
          <div className="card p-5"><p className="eyebrow">{tr("Consenting candidates", "مرشحون موافقون")}</p><p className="mt-2 text-3xl font-bold text-teal">{ov.candidates}</p></div>
          <div className="card p-5"><p className="eyebrow">{tr("AI calls logged", "طلبات الذكاء الاصطناعي")}</p><p className="mt-2 text-3xl font-bold text-teal">{ov.ai_log.length}</p><p className="text-sm text-muted">{ov.ai_log.filter((e) => e.mode === "ai").length} AI · {ov.ai_log.filter((e) => e.mode === "offline").length} offline</p></div>
        </section>
      )}
      {tab === "data" && <RecordEditor ov={ov} onSaved={load} />}
      {tab === "provenance" && <Provenance issues={ov.issues} />}
      {tab === "opportunities" && (
        <section className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm"><thead><tr className="border-b border-line text-xs uppercase tracking-wider text-muted"><th className="p-3 text-start">{tr("Role", "الدور")}</th><th className="p-3 text-start">{tr("Requirements", "المتطلبات")}</th><th className="p-3 text-start">{tr("Status", "الحالة")}</th><th className="p-3" /></tr></thead>
            <tbody>{ov.roles.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0"><td className="p-3 font-semibold text-teal">{r.title}<span className="block text-xs font-normal text-muted">{r.id}</span></td><td className="p-3">{r.requirements.length}</td><td className="p-3"><VerificationBadge v={r.verification} /></td>
                <td className="p-3 text-end">{r.deletable ? <button className="text-sm text-bad underline" onClick={async () => { if (!confirm(tr("Delete this demo role?", "حذف هذا الدور التجريبي؟"))) return; await fetch(`/api/admin/roles?id=${encodeURIComponent(r.id)}`, { method: "DELETE" }); load(); }}>{tr("Delete", "حذف")}</button> : <span className="text-xs text-muted">{tr("seeded", "مضمّن")}</span>}</td></tr>
            ))}</tbody></table>
        </section>
      )}
      {tab === "ai" && (
        <section className="card overflow-x-auto">
          <p className="p-4 text-sm text-muted">{tr("Metadata only: no student text is stored. Rows with an error or with outputs removed by validation are highlighted.", "بيانات وصفية فقط: لا يُخزَّن أي نص للطالب. تُميَّز الصفوف التي فيها خطأ أو مخرجات حُذفت بالتحقق.")}</p>
          {ov.ai_log.length === 0 ? <p className="p-4 text-muted">{tr("No AI calls yet.", "لا توجد طلبات بعد.")}</p> : (
            <table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-line text-xs uppercase tracking-wider text-muted">{["Time", "Module", "Mode", "Latency", "Returned", "Removed by checks", "Error / note"].map((h) => <th key={h} className="p-3 text-start">{h}</th>)}</tr></thead>
              <tbody>{ov.ai_log.map((e, i) => (
                <tr key={i} className={`border-b border-line last:border-0 ${e.error || e.dropped_by_validation ? "bg-warn-100/50" : ""}`}><td className="p-3 text-xs">{new Date(e.at).toLocaleString()}</td><td className="p-3">{e.module}</td><td className="p-3">{e.mode}{e.model ? ` (${e.model})` : ""}</td><td className="p-3">{e.latency_ms ?? "—"}</td><td className="p-3">{e.returned}</td><td className="p-3">{e.dropped_by_validation}</td><td className="p-3 text-xs">{e.error ?? e.notes ?? ""}</td></tr>
              ))}</tbody></table>
          )}
        </section>
      )}
      {tab === "import" && <Import onDone={load} />}
    </div>
  );
}

function Provenance({ issues }: { issues: Overview["issues"] }) {
  const { tr } = useBridge();
  const [ds, setDs] = useState("all");
  const shown = issues.filter((i) => ds === "all" || i.dataset === ds);
  return (
    <section className="card p-5">
      <div className="flex flex-wrap gap-2">{["all", "universities", "programs", "scholarships", "courses"].map((d) => <button key={d} className="chip" aria-pressed={ds === d} onClick={() => setDs(d)}>{d} ({d === "all" ? issues.length : issues.filter((i) => i.dataset === d).length})</button>)}</div>
      <p className="mt-3 text-sm text-muted">{tr("Records without sources, with sources older than 180 days, or with missing key fields. Fix them in Edit records.", "سجلات بلا مصادر، أو بمصادر أقدم من 180 يوماً، أو بحقول أساسية ناقصة. أصلحها من تعديل السجلات.")}</p>
      <ul className="mt-3 max-h-[60vh] divide-y divide-line overflow-y-auto text-sm">{shown.map((i, k) => <li key={k} className="flex gap-3 py-2"><span className="w-28 shrink-0 text-muted">{i.dataset}</span><span className="w-48 shrink-0 font-mono text-xs">{i.id}</span><span>{i.issue}</span></li>)}</ul>
    </section>
  );
}

function RecordEditor({ ov, onSaved }: { ov: Overview; onSaved: () => void }) {
  const { tr } = useBridge();
  const [ds, setDs] = useState<Dataset>("programs");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Record<string, unknown> | null>(null);
  const [json, setJson] = useState("");
  const [srcUrl, setSrcUrl] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const rows = useMemo(() => (ov.data[ds] ?? []).filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase())), [ov, ds, q]);
  const open = (r: Record<string, unknown> | null) => { setSel(r); setJson(JSON.stringify(r ?? template(ds), null, 2)); setMsg(null); setSrcUrl(""); };

  async function save() {
    let rec: Record<string, unknown>;
    try { rec = JSON.parse(json); } catch { setMsg(tr("Invalid JSON", "JSON غير صالح")); return; }
    if (srcUrl) rec = { ...rec, sources: [...((rec.sources as unknown[]) ?? []), { url: srcUrl, title: "Added by admin", checked_at: new Date().toISOString().slice(0, 10) }] };
    const r = await fetch("/api/admin/record", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataset: ds, record: rec }) });
    const d = await r.json();
    if (!r.ok) { setMsg(d.error); return; }
    setMsg(tr(`Saved. Verification: ${d.saved.verification}`, `تم الحفظ. حالة التوثيق: ${d.saved.verification}`)); setJson(JSON.stringify(d.saved, null, 2)); setSrcUrl(""); onSaved();
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="card p-4">
        <div className="flex flex-wrap gap-2">{(["programs", "universities", "courses", "scholarships"] as Dataset[]).map((d) => <button key={d} className="chip" aria-pressed={ds === d} onClick={() => { setDs(d); open(null); setSel(null); setJson(""); }}>{d}</button>)}</div>
        <label className="sr-only" htmlFor="q">{tr("Search", "بحث")}</label>
        <input id="q" className="input mt-3" placeholder={tr("Search…", "بحث…")} value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-secondary mt-3 !py-1.5" onClick={() => open(null)}>+ {tr("New record", "سجل جديد")}</button>
        <ul className="mt-3 max-h-[55vh] divide-y divide-line overflow-y-auto">{rows.map((r) => (
          <li key={String(r.id)}><button className={`flex w-full items-center justify-between gap-2 p-2 text-start text-sm hover:bg-mist ${sel?.id === r.id ? "bg-mist" : ""}`} onClick={() => open(r)}>
            <span className="min-w-0 truncate">{String(r.name_en ?? r.title ?? r.id)} <span className="text-xs text-muted">{String(r.university_id ?? r.provider ?? "")}</span></span>
            <span className="flex shrink-0 items-center gap-2">{typeof r.completeness === "number" && <span className="text-xs text-muted" title={tr("Record completeness", "اكتمال السجل")}>{r.completeness}%</span>}<VerificationBadge v={r.verification as Verification} /></span></button></li>
        ))}</ul>
      </div>
      <div className="card p-4">
        {json ? (<>
          <label className="label" htmlFor="rec">{tr("Record (JSON, validated on save)", "السجل (JSON، يُتحقق منه عند الحفظ)")}</label>
          <textarea id="rec" className="input min-h-[45vh] font-mono text-xs" value={json} onChange={(e) => setJson(e.target.value)} />
          <label className="label mt-3" htmlFor="src">{tr("Add a source you checked today (optional)", "أضف مصدراً تحققت منه اليوم (اختياري)")}</label>
          <input id="src" className="input" type="url" placeholder="https://" value={srcUrl} onChange={(e) => setSrcUrl(e.target.value)} />
          <p className="mt-1 text-xs text-muted">{tr("\"verified\" is only kept when the record has a dated source. Saving stores an override; the seed file is unchanged.", "تُحفظ حالة \"موثّق\" فقط إذا كان للسجل مصدر مؤرخ. الحفظ يُنشئ نسخة معدّلة؛ ملف البيانات الأصلي لا يتغير.")}</p>
          {msg && <p role="status" className="mt-2 rounded-xl bg-mist p-3 text-sm">{msg}</p>}
          <div className="mt-3 flex gap-2"><button className="btn-primary" onClick={save}>{tr("Save", "حفظ")}</button>
            {sel && <button className="btn-ghost" onClick={async () => { await fetch(`/api/admin/record?dataset=${ds}&id=${encodeURIComponent(String(sel.id))}`, { method: "DELETE" }); setMsg(tr("Admin edit removed (original restored if one exists).", "تمت إزالة التعديل (استُعيد الأصل إن وجد).")); onSaved(); }}>{tr("Revert my edit", "تراجع عن تعديلي")}</button>}</div>
          {ds === "programs" && <StudyPlanReader json={json} setJson={setJson} />}
        </>) : <p className="text-muted">{tr("Choose a record or create a new one.", "اختر سجلاً أو أنشئ سجلاً جديداً.")}</p>}
      </div>
    </section>
  );
}

function template(ds: Dataset): Record<string, unknown> {
  const base = { sources: [], verification: "unverified", notes: null };
  if (ds === "programs") return { id: "", university_id: "", name_en: "", name_ar: null, field: "computer-science", degree: "bachelor", credit_hours: null, tuition_jod_per_credit_hour: null, tuition_track: null, tuition_year: null, min_admission_avg: null, min_admission_year: null, admission_track: null, eligible_streams: [], internship_note: null, career_tags: [], ...base };
  if (ds === "universities") return { id: "", name_en: "", name_ar: null, type: "public", city: null, governorate: null, website: null, accreditation_note: null, ...base };
  if (ds === "courses") return { id: "", title: "", provider: "", url: "", language: "en", cost: "free", skills: [], level: "beginner", est_hours: null, prerequisite_skills: [], has_practical_project: false, ...base };
  return { id: "", name_en: "", name_ar: null, provider: "", kind: "scholarship", eligibility_text: "", criteria: { min_avg: null, need_based: null, fields: [], nationality: null, stage: "university" }, coverage_text: null, url: "", ...base };
}

function Import({ onDone }: { onDone: () => void }) {
  const { tr } = useBridge();
  const [dataset, setDataset] = useState<Dataset>("programs");
  const [json, setJson] = useState("");
  const [out, setOut] = useState<string | null>(null);
  async function run(dry: boolean) {
    setOut(null);
    let rows: unknown;
    try { rows = JSON.parse(json); } catch { setOut(tr("That is not valid JSON.", "هذا ليس JSON صالحاً.")); return; }
    if (!Array.isArray(rows)) { setOut(tr("Paste a JSON array of records.", "الصق مصفوفة JSON من السجلات.")); return; }
    const r = await fetch("/api/data/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataset, rows, dry_run: dry }) });
    const x = await r.json();
    if (!r.ok) { setOut(x.error); return; }
    setOut(`${x.valid} valid, ${x.invalid} invalid${x.saved ? " · saved" : " · dry run, nothing saved"}${x.errors.length ? "\n" + x.errors.slice(0, 10).map((e: { index: number; issues: string[] }) => `#${e.index}: ${e.issues.join("; ")}`).join("\n") : ""}`);
    if (x.saved) onDone();
  }
  return (
    <section className="card p-5">
      <p className="text-sm text-muted">{tr("Paste a JSON array that follows data/verified/SCHEMA.md. Each row is validated; rows marked verified without a source are downgraded. Importing replaces the previous import for that dataset.", "الصق مصفوفة JSON وفق data/verified/SCHEMA.md. يتم التحقق من كل سجل؛ والسجلات الموثّقة دون مصدر تُخفَّض. الاستيراد يستبدل الاستيراد السابق لهذه المجموعة.")}</p>
      <div className="mt-3 flex flex-wrap gap-2">{(["universities", "programs", "scholarships", "courses"] as Dataset[]).map((x) => <button key={x} className="chip" aria-pressed={dataset === x} onClick={() => setDataset(x)}>{x}</button>)}</div>
      <label htmlFor="imp" className="sr-only">JSON</label>
      <textarea id="imp" className="input mt-3 min-h-48 font-mono text-xs" value={json} onChange={(e) => setJson(e.target.value)} placeholder='[{"id": "...", ...}]' />
      <div className="mt-3 flex gap-2"><button className="btn-secondary" onClick={() => run(true)}>{tr("Validate (dry run)", "تحقق (تجربة)")}</button><button className="btn-primary" onClick={() => run(false)}>{tr("Import", "استيراد")}</button></div>
      {out && <pre role="status" className="mt-3 whitespace-pre-wrap rounded-xl bg-mist p-3 text-xs">{out}</pre>}
    </section>
  );
}

function StudyPlanReader({ json, setJson }: { json: string; setJson: (s: string) => void }) {
  const { tr } = useBridge();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ mode: string; topics: { topic_id: string; quote: string }[]; internship_quote: string | null; dropped: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function read() {
    setBusy(true); setErr(null);
    const r = await fetch("/api/admin/curriculum", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    const d = await r.json(); setBusy(false);
    if (!r.ok) { setErr(d.error ?? "Error"); return; }
    setOut(d);
  }
  function apply() {
    if (!out) return;
    try {
      const rec = JSON.parse(json);
      rec.curriculum_topics = [...new Set([...(rec.curriculum_topics ?? []), ...out.topics.map((t) => t.topic_id)])];
      if (out.internship_quote && !rec.internship_note) rec.internship_note = out.internship_quote;
      setJson(JSON.stringify(rec, null, 2));
    } catch { setErr(tr("The record JSON above is invalid.", "JSON السجل أعلاه غير صالح.")); }
  }
  return (
    <details className="mt-5 rounded-2xl bg-ivory p-3">
      <summary className="cursor-pointer text-sm font-semibold text-teal">✦ {tr("Read a study plan into curriculum topics", "اقرأ خطة دراسية إلى مواضيع")}</summary>
      <label className="label mt-3" htmlFor="sp">{tr("Paste the course list from the official study plan", "الصق قائمة المواد من الخطة الدراسية الرسمية")}</label>
      <textarea id="sp" className="input min-h-32 text-xs" value={text} onChange={(e) => setText(e.target.value)} />
      <button className="btn-secondary mt-2" disabled={busy || text.trim().length < 20} onClick={read}>{busy ? tr("Reading…", "جارٍ القراءة…") : tr("Suggest topics", "اقترح المواضيع")}</button>
      {err && <p role="alert" className="mt-2 text-sm text-bad">{err}</p>}
      {out && (
        <div role="status" className="mt-3 text-sm">
          <p className="text-xs text-muted">{out.mode === "ai" ? tr("AI suggestions; each topic is backed by a course title found in your text.", "اقتراحات الذكاء الاصطناعي؛ كل موضوع مدعوم بعنوان مادة موجود في النص.") : tr("Offline keyword rules (AI unavailable).", "قواعد كلمات مفتاحية (الذكاء الاصطناعي غير متاح).")}{out.dropped ? ` ${tr(`${out.dropped} suggestion(s) dropped: quote not in the text.`, `تم استبعاد ${out.dropped} اقتراح: الاقتباس غير موجود في النص.`)}` : ""}</p>
          <ul className="mt-2 space-y-1">{out.topics.map((t) => <li key={t.topic_id}><strong>{t.topic_id}</strong> <span className="text-muted">“{t.quote}”</span></li>)}</ul>
          {out.internship_quote && <p className="mt-2">{tr("Practical training", "التدريب العملي")}: <span className="text-muted">“{out.internship_quote}”</span></p>}
          <button className="btn-ghost mt-2" onClick={apply}>{tr("Add to the record above (then review and save)", "أضف إلى السجل أعلاه (ثم راجع واحفظ)")}</button>
        </div>
      )}
    </details>
  );
}

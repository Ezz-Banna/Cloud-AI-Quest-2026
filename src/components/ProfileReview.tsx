"use client";
import { useState } from "react";
import { CITIES, FIELDS } from "@/lib/data/taxonomy";
import type { LearnerProfile, Stream } from "@/lib/types";
import { useBridge } from "./ProfileProvider";

const STREAMS: { id: Stream; en: string; ar: string }[] = [
  { id: "scientific", en: "Scientific", ar: "علمي" }, { id: "literary", en: "Literary", ar: "أدبي" },
  { id: "it", en: "IT", ar: "تكنولوجيا المعلومات" }, { id: "industrial", en: "Industrial", ar: "صناعي" },
  { id: "health", en: "Health", ar: "صحي" }, { id: "other", en: "Other / equivalent", ar: "آخر / شهادة معادلة" },
];

export function ProfileReview({ initial, onSave, saveLabel }: { initial: LearnerProfile; onSave: (p: LearnerProfile) => void; saveLabel?: string }) {
  const { tr, lang } = useBridge();
  const [p, setP] = useState<LearnerProfile>(initial);
  const [careers, setCareers] = useState(initial.dream_careers.join(", "));
  const [access, setAccess] = useState(initial.accessibility_needs.join(", "));
  const toggle = (k: "interests" | "preferred_cities", v: string) =>
    setP((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }));
  const avgInvalid = p.tawjihi_avg != null && (p.tawjihi_avg < 0 || p.tawjihi_avg > 100);

  return (
    <form className="space-y-6" onSubmit={(e) => {
      e.preventDefault();
      if (avgInvalid) return;
      onSave({ ...p, dream_careers: careers.split(/[,،]/).map((s) => s.trim()).filter(Boolean), accessibility_needs: access.split(/[,،]/).map((s) => s.trim()).filter(Boolean) });
    }}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="avg">{tr("Tawjihi or equivalent average (%)", "معدل التوجيهي أو ما يعادله (%)")}</label>
          <input id="avg" className="input" type="number" inputMode="decimal" step="0.1" min={0} max={100} value={p.tawjihi_avg ?? ""} aria-invalid={avgInvalid} aria-describedby="avg-help"
            onChange={(e) => setP({ ...p, tawjihi_avg: e.target.value === "" ? null : Number(e.target.value) })} />
          <p id="avg-help" className={`mt-1 text-xs ${avgInvalid ? "text-bad" : "text-muted"}`}>{avgInvalid ? tr("Enter a number between 0 and 100.", "أدخل رقماً بين 0 و100.") : tr("Used only to compare with published minimums.", "يُستخدم فقط للمقارنة مع الحدود الدنيا المنشورة.")}</p>
        </div>
        <div>
          <label className="label" htmlFor="stream">{tr("Stream", "الفرع")}</label>
          <select id="stream" className="input" value={p.stream ?? ""} onChange={(e) => setP({ ...p, stream: (e.target.value || null) as Stream | null })}>
            <option value="">{tr("Not stated", "غير محدد")}</option>
            {STREAMS.map((s) => <option key={s.id} value={s.id}>{lang === "ar" ? s.ar : s.en}</option>)}
          </select>
        </div>
      </div>

      <fieldset>
        <legend className="label">{tr("Fields you're interested in", "التخصصات التي تهمك")}</legend>
        <div className="flex flex-wrap gap-2">
          {FIELDS.map((f) => <button type="button" key={f.id} className="chip" aria-pressed={p.interests.includes(f.id)} onClick={() => toggle("interests", f.id)}>{lang === "ar" ? f.name_ar : f.name_en}</button>)}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="careers">{tr("Dream careers (comma separated)", "المهن التي تحلم بها (افصل بفاصلة)")}</label>
        <input id="careers" className="input" value={careers} onChange={(e) => setCareers(e.target.value)} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="budget">{tr("Tuition budget per year (JOD)", "ميزانية الرسوم السنوية (دينار)")}</label>
          <input id="budget" className="input" type="number" min={0} step={100} value={p.budget_jod_per_year ?? ""} onChange={(e) => setP({ ...p, budget_jod_per_year: e.target.value === "" ? null : Number(e.target.value) })} />
        </div>
        <fieldset>
          <legend className="label">{tr("Need financial support?", "هل تحتاج إلى دعم مالي؟")}</legend>
          <div className="flex flex-wrap gap-2">
            {[[true, tr("Yes", "نعم")], [false, tr("No", "لا")], [null, tr("Not sure", "لست متأكداً")]].map(([v, l]) => (
              <button type="button" key={String(v)} className="chip" aria-pressed={p.financial_need === v} onClick={() => setP({ ...p, financial_need: v as boolean | null })}>{l as string}</button>
            ))}
          </div>
        </fieldset>
      </div>

      <fieldset>
        <legend className="label">{tr("Preferred cities", "المدن المفضلة")}</legend>
        <div className="flex flex-wrap gap-2">
          {CITIES.map((c) => <button type="button" key={c} className="chip" aria-pressed={p.preferred_cities.includes(c)} onClick={() => toggle("preferred_cities", c)}>{c}</button>)}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-teal" checked={p.open_to_relocate !== false} onChange={(e) => setP({ ...p, open_to_relocate: e.target.checked })} />
          {tr("I'm open to studying in another city", "أنا منفتح على الدراسة في مدينة أخرى")}
        </label>
      </fieldset>

      <fieldset>
        <legend className="label">{tr("University type", "نوع الجامعة")}</legend>
        <div className="flex flex-wrap gap-2">
          {(["any", "public", "private"] as const).map((v) => (
            <button type="button" key={v} className="chip" aria-pressed={(p.university_type ?? "any") === v} onClick={() => setP({ ...p, university_type: v })}>
              {v === "any" ? tr("No preference", "لا تفضيل") : v === "public" ? tr("Public", "حكومية") : tr("Private", "خاصة")}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="access">{tr("Accessibility or support needs (optional)", "احتياجات الوصول أو الدعم (اختياري)")}</label>
        <input id="access" className="input" value={access} onChange={(e) => setAccess(e.target.value)} />
        <p className="mt-1 text-xs text-muted">{tr("Stays on your device. Used to remind you to check campus support services.", "يبقى على جهازك. يُستخدم لتذكيرك بالتحقق من خدمات الدعم في الحرم الجامعي.")}</p>
      </div>

      <button type="submit" className="btn-primary !px-7 !py-3">{saveLabel ?? tr("Save and see my matches", "احفظ واعرض النتائج")}</button>
    </form>
  );
}

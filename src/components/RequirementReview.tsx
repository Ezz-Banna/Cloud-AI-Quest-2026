"use client";
// The person checks what was read from a posting before anything is compared. Every item can be changed or removed.
import { useState } from "react";
import { useBridge } from "./ProfileProvider";
import { SKILLS } from "@/lib/data/taxonomy";
import type { Level, RequirementFlag, RequirementImportance, RoleRequirement } from "@/lib/types";

export type Draft = RoleRequirement & { id: string; label: string; importance: RequirementImportance; flags: RequirementFlag[] };

const FLAG: Record<RequirementFlag, { en: string; ar: string }> = {
  "conflicting-statements": { en: "The posting says different things about this. Please choose.", ar: "يذكر الإعلان أموراً متعارضة عن هذا. يُرجى الاختيار." },
  "no-stated-requirement": { en: "Mentioned, but the posting doesn't say whether it is needed.", ar: "مذكورة، لكن الإعلان لا يحدد إن كانت مطلوبة." },
  "not-in-skill-list": { en: "Not in our skill list, so it can't be compared. It stays visible here.", ar: "ليست في قائمة مهاراتنا، لذا لا يمكن مقارنتها. تبقى ظاهرة هنا." },
  "duplicate-merged": { en: "Mentioned more than once; merged into one.", ar: "ذُكرت أكثر من مرة؛ دُمجت في واحدة." },
  "ai-and-rules-disagree": { en: "The AI model and the keyword rules read this differently. Please check.", ar: "قرأ نموذج الذكاء الاصطناعي وقواعد الكلمات هذا بشكل مختلف. يُرجى التحقق." },
  "edited-by-user": { en: "Edited by you.", ar: "عدّلتَه بنفسك." },
};

export function RequirementReview({ initial, onConfirm, onCancel, ignored = 0, suspicious = 0 }: { initial: Draft[]; onConfirm: (r: Draft[]) => void; onCancel: () => void; ignored?: number; suspicious?: number }) {
  const { tr, lang } = useBridge();
  const [items, setItems] = useState<Draft[]>(initial);
  const edit = (id: string, patch: Partial<Draft>) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch, flags: [...new Set([...x.flags.filter((f) => f !== "conflicting-statements" && f !== "ai-and-rules-disagree" && f !== "no-stated-requirement"), "edited-by-user" as const])] } : x)));
  const add = () => setItems((xs) => [...xs, { id: `u-${Date.now()}`, skill_id: null, label: "", level: 1, mandatory: false, importance: "required", flags: ["edited-by-user"] }]);
  const unclear = items.filter((x) => x.importance === "unclear").length;
  const groupLabel = (g?: string) => (g ? items.filter((x) => x.alt_group === g).map((x) => x.label).join(tr(" or ", " أو ")) : "");

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="rr-h">
      <h2 id="rr-h" className="h2">{tr("Check what we read from the posting", "تحقّق مما قرأناه من الإعلان")}</h2>
      <p className="mt-1 text-sm text-muted">{tr("Nothing is compared until you confirm. Change anything that's wrong; each item shows the sentence it came from.", "لا تتم أي مقارنة قبل تأكيدك. غيّر أي شيء غير صحيح؛ يظهر مع كل بند النص الذي أُخذ منه.")}</p>
      {(ignored > 0 || suspicious > 0) && <p className="mt-2 text-xs text-muted">{tr(`${ignored} sentence(s) had no skill and were left out.`, `${ignored} جملة لم تتضمن مهارة واستُبعدت.`)}{suspicious > 0 && tr(` ${suspicious} sentence(s) looked like instructions to a computer and were ignored.`, ` ${suspicious} جملة بدت كتعليمات موجّهة لحاسوب وتم تجاهلها.`)}</p>}
      <ul className="mt-4 space-y-3">
        {items.map((x) => (
          <li key={x.id} className="rounded-2xl border border-line p-4">
            <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_0.8fr_auto] sm:items-end">
              <label className="text-sm"><span className="block text-xs font-semibold text-muted">{tr("Skill", "المهارة")}{x.label && ` · “${x.label}”`}</span>
                <select className="input mt-1 !py-1.5" value={x.skill_id ?? ""} onChange={(e) => edit(x.id, { skill_id: e.target.value || null })}>
                  <option value="">{tr("Not in our skill list (won't be compared)", "ليست في قائمة مهاراتنا (لن تُقارن)")}</option>
                  {SKILLS.map((s) => <option key={s.id} value={s.id}>{lang === "ar" ? s.name_ar : s.name_en}</option>)}
                </select>
              </label>
              <label className="text-sm"><span className="block text-xs font-semibold text-muted">{tr("The posting says it is", "يقول الإعلان إنها")}</span>
                <select className="input mt-1 !py-1.5" value={x.importance} onChange={(e) => { const v = e.target.value as RequirementImportance; edit(x.id, { importance: v, mandatory: v === "required" }); }}>
                  <option value="required">{tr("Required", "أساسية")}</option>
                  <option value="preferred">{tr("Preferred", "مفضّلة")}</option>
                  <option value="not-required">{tr("Not required", "غير مطلوبة")}</option>
                  <option value="unclear">{tr("Unclear (don't compare)", "غير واضح (لا تُقارن)")}</option>
                </select>
              </label>
              <label className="text-sm"><span className="block text-xs font-semibold text-muted">{tr("Level", "المستوى")}</span>
                <select className="input mt-1 !py-1.5" value={x.level} onChange={(e) => edit(x.id, { level: Number(e.target.value) as Level })}>
                  <option value={1}>{tr("Basic", "أساسي")}</option><option value={2}>{tr("Working", "عملي")}</option><option value={3}>{tr("Strong", "متقدم")}</option>
                </select>
              </label>
              <button type="button" className="btn-secondary !py-1.5" onClick={() => setItems((xs) => xs.filter((y) => y.id !== x.id))} aria-label={tr(`Remove ${x.label || "item"}`, `احذف ${x.label || "البند"}`)}>{tr("Remove", "احذف")}</button>
            </div>
            {x.alt_group && <p className="mt-2 text-xs text-teal">{tr("Alternatives (any one is enough):", "بدائل (يكفي أحدها):")} {groupLabel(x.alt_group)}</p>}
            {x.quote && <p className="mt-2 text-xs text-muted">{tr("From the posting:", "من الإعلان:")} <q dir="auto">{x.quote}</q></p>}
            {x.flags.filter((f) => f !== "edited-by-user").map((f) => <p key={f} className="mt-1 text-xs text-warn">{tr(FLAG[f].en, FLAG[f].ar)}</p>)}
          </li>
        ))}
      </ul>
      {items.length === 0 && <p className="mt-4 text-sm text-muted">{tr("No requirements yet. Add the ones the posting asks for.", "لا توجد متطلبات بعد. أضف ما يطلبه الإعلان.")}</p>}
      <button type="button" className="mt-3 text-sm font-semibold text-sage-600 underline underline-offset-2" onClick={add}>+ {tr("Add a requirement", "أضف متطلباً")}</button>
      {unclear > 0 && <p className="mt-3 text-sm text-warn">{tr(`${unclear} item(s) are marked unclear and won't be compared until you choose.`, `${unclear} بند/بنود معلّمة كغير واضحة ولن تُقارن حتى تختار.`)}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="btn-primary" onClick={() => onConfirm(items)}>{tr("Confirm and compare", "أكّد وقارن")}</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>{tr("Cancel", "إلغاء")}</button>
      </div>
    </section>
  );
}

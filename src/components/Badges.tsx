"use client";
import { useEffect, useState } from "react";
import { useBridge } from "./ProfileProvider";
import type { EvidenceStatus, Source, Verification } from "@/lib/types";

const V: Record<Verification, { en: string; ar: string; cls: string; icon: string }> = {
  verified: { en: "Verified source", ar: "مصدر موثّق", cls: "bg-ok-100 text-ok", icon: "✓" },
  partial: { en: "Partly verified", ar: "موثّق جزئياً", cls: "bg-warn-100 text-warn", icon: "◐" },
  unverified: { en: "Unverified", ar: "غير موثّق", cls: "bg-bad-100 text-bad", icon: "!" },
  synthetic: { en: "Synthetic demo data", ar: "بيانات تجريبية", cls: "bg-sand-100 text-sand-700", icon: "◇" },
};

export function VerificationBadge({ v }: { v: Verification }) {
  const { tr } = useBridge();
  const x = V[v] ?? V.unverified;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${x.cls}`}><span aria-hidden="true">{x.icon}</span>{tr(x.en, x.ar)}</span>;
}

const E: Record<EvidenceStatus, { en: string; ar: string; cls: string; hint_en: string; hint_ar: string }> = {
  "self-reported": { en: "Self-reported", ar: "إفادة ذاتية", cls: "bg-mist text-muted", hint_en: "You described this skill. Nothing is attached yet.", hint_ar: "وصفتَ هذه المهارة بنفسك. لم يُرفق أي عمل بعد." },
  "evidence-attached": { en: "Evidence attached", ar: "دليل مرفق", cls: "bg-sage-100 text-teal", hint_en: "A link to your work is attached. Nobody has reviewed it yet.", hint_ar: "أرفقتَ رابطاً لعملك. لم يُراجعه أحد بعد." },
  "awaiting-review": { en: "Awaiting review", ar: "بانتظار المراجعة", cls: "bg-warn-100 text-warn", hint_en: "You asked for a review. A reviewer will check the work against a stated rubric.", hint_ar: "طلبتَ مراجعة. سيقارن المراجِع العمل بمعايير معلنة." },
  reviewed: { en: "Reviewed against a stated rubric", ar: "روجِع وفق معايير معلنة", cls: "bg-ok-100 text-ok", hint_en: "A named reviewer checked the work against a stated rubric and recorded a reason. This is not a certificate.", hint_ar: "راجع مراجِع مسمّى العمل وفق معايير معلنة وسجّل السبب. هذه ليست شهادة." },
  "needs-clarification": { en: "Needs clarification", ar: "يحتاج إلى توضيح", cls: "bg-bad-100 text-bad", hint_en: "The reviewer needs more information. See their note.", hint_ar: "يحتاج المراجِع إلى معلومات إضافية. اطّلع على ملاحظته." },
};
export function evidenceHint(s: EvidenceStatus, lang: "en" | "ar") { return lang === "ar" ? E[s].hint_ar : E[s].hint_en; }
export function EvidenceBadge({ s }: { s: EvidenceStatus }) {
  const { tr } = useBridge();
  const x = E[s] ?? E["self-reported"];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${x.cls}`} title={tr(x.hint_en, x.hint_ar)}>{tr(x.en, x.ar)}</span>;
}

export function Sources({ sources }: { sources: Source[] }) {
  const { tr } = useBridge();
  if (!sources?.length) return <span className="text-xs text-muted">{tr("No source recorded", "لا يوجد مصدر مسجّل")}</span>;
  return (
    <ul className="space-y-0.5 text-xs text-muted">
      {sources.slice(0, 3).map((s, i) => (
        <li key={i} className="truncate">
          <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-2 hover:text-teal">{s.title || new URL(s.url).hostname}</a>
          {s.checked_at && <span> · {tr("checked", "تم التحقق")} {s.checked_at}</span>}
        </li>
      ))}
    </ul>
  );
}

export function ModeBadge({ mode }: { mode: "ai" | "offline"; model?: string }) {
  const { tr } = useBridge();
  return mode === "ai"
    ? <span className="inline-flex items-center gap-1 rounded-full bg-teal/10 px-2.5 py-0.5 text-xs font-semibold text-teal">✦ {tr("Read by an AI model, checked by rules", "قرأه نموذج ذكاء اصطناعي ودققته القواعد")}</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-warn-100 px-2.5 py-0.5 text-xs font-semibold text-warn">⚙ {tr("Read by keyword rules (no AI model)", "قُرئ بقواعد الكلمات المفتاحية (دون نموذج ذكاء اصطناعي)")}</span>;
}

let statusPromise: Promise<{ ai: boolean; model: string | null; ai_reason: string | null }> | null = null;
/** States, before anything is submitted, whether an AI model or keyword rules will read the text. */
export function AnalysisMode() {
  const { tr } = useBridge();
  const [s, setS] = useState<{ ai: boolean; model: string | null; ai_reason: string | null } | null>(null);
  useEffect(() => {
    statusPromise ??= fetch("/api/status").then((r) => r.json());
    statusPromise.then(setS).catch(() => setS(null));
  }, []);
  if (!s) return null;
  if (s.ai) return <p className="text-xs text-muted">{tr("An AI model reads the text first; keyword rules then check every item against the original wording.", "يقرأ نموذج ذكاء اصطناعي النص أولاً، ثم تتحقق قواعد الكلمات المفتاحية من كل بند مقابل النص الأصلي.")}</p>;
  const why = s.ai_reason === "daily-limit-reached" ? tr(" (today's AI limit was reached)", " (بلغ الاستخدام الحدّ اليومي)") : "";
  return <p className="text-xs text-muted">{tr(`No AI model is connected right now${why}. Keyword rules read the text; they handle common wording but can miss unusual phrasing, so please check the result.`, `لا يوجد نموذج ذكاء اصطناعي متصل حالياً${why}. تقرأ قواعد الكلمات المفتاحية النص؛ وهي تتعامل مع الصياغات الشائعة لكنها قد تفوّت الصياغات غير المألوفة، لذا يُرجى مراجعة النتيجة.`)}</p>;
}

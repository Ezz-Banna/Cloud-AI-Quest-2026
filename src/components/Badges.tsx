"use client";
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

const E: Record<EvidenceStatus, { en: string; ar: string; cls: string }> = {
  "self-reported": { en: "Self-reported", ar: "إفادة ذاتية", cls: "bg-mist text-muted" },
  "evidence-attached": { en: "Evidence attached", ar: "دليل مرفق", cls: "bg-sage-100 text-teal" },
  "practical-assessed": { en: "Practically assessed", ar: "مُقيَّم عملياً", cls: "bg-ok-100 text-ok" },
  "issuer-verified": { en: "Issuer verified", ar: "موثّق من الجهة المصدرة", cls: "bg-ok-100 text-ok" },
};
export function EvidenceBadge({ s }: { s: EvidenceStatus }) {
  const { tr } = useBridge();
  const x = E[s];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${x.cls}`}>{tr(x.en, x.ar)}</span>;
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

export function ModeBadge({ mode, model }: { mode: "ai" | "offline"; model?: string }) {
  const { tr } = useBridge();
  return mode === "ai"
    ? <span className="inline-flex items-center gap-1 rounded-full bg-teal/10 px-2.5 py-0.5 text-xs font-semibold text-teal" title={model}>✦ {tr("Read by AI", "قرأه الذكاء الاصطناعي")}</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-warn-100 px-2.5 py-0.5 text-xs font-semibold text-warn">⚙ {tr("Offline keyword rules (AI unavailable)", "قواعد كلمات مفتاحية بدون اتصال (الذكاء الاصطناعي غير متاح)")}</span>;
}

"use client";
// Small static visuals that replace explanatory paragraphs: labelled icons, numbered step strips, the evidence-state
// ladder and a sourced statistic. None of them animate; each page keeps its single motion component elsewhere.
import { useBridge } from "./ProfileProvider";
import type { EvidenceStatus } from "@/lib/types";

const PATHS = {
  programs: ["M22 10 12 5 2 10l10 5 10-5z", "M6 12v5c3 3 9 3 12 0v-5"],
  skills: ["M12 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z", "M15.5 13 17 22l-5-3-5 3 1.5-9"],
  role: ["M4 7h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z", "M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"],
  source: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6", "M16 13H8", "M16 17H8"],
  reasons: ["M9 11l3 3L22 4", "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"],
  confirm: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", "M16 11l2 2 4-4"],
  said: ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
  link: ["M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"],
  clock: ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z", "M12 6v6l4 2"],
  reviewed: ["M22 11.08V12a10 10 0 1 1-5.93-9.14", "M22 4 12 14.01l-3-3"],
  lock: ["M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z", "M7 11V7a5 5 0 0 1 10 0v4"],
  rules: ["M4 21v-7", "M4 10V3", "M12 21v-9", "M12 8V3", "M20 21v-5", "M20 12V3", "M1 14h6", "M9 8h6", "M17 16h6"],
  read: ["M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z", "M21 21l-4.35-4.35"],
  edit: ["M12 20h9", "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"],
  cost: ["M8 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z", "M18.09 10.37A6 6 0 1 1 10.34 18", "M7 6h1v4"],
  step: ["M5 12h14", "M12 5l7 7-7 7"],
} as const;
export type IconName = keyof typeof PATHS;

/** Decorative unless `label` is given; pair it with visible text. */
export function Icon({ name, className = "size-5", label }: { name: IconName; className?: string; label?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      className={`shrink-0 ${name === "step" ? "rtl:-scale-x-100" : ""} ${className}`} {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}>
      {PATHS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

/** Numbered steps in one row on wide screens, a column on phones. */
export function StepStrip({ steps, label }: { steps: { icon: IconName; text: string }[]; label: string }) {
  return (
    <ol aria-label={label} className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
      {steps.map((s, i) => (
        <li key={s.text} className="flex flex-1 items-center gap-3 rounded-2xl bg-mist/70 px-3 py-2.5 text-sm font-semibold text-teal">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-teal text-xs font-bold text-ivory">{i + 1}</span>
          <Icon name={s.icon} className="size-5 text-sage-600" />
          <span>{s.text}</span>
        </li>
      ))}
    </ol>
  );
}

const LADDER: { s: EvidenceStatus; icon: IconName; en: string; ar: string; how_en: string; how_ar: string }[] = [
  { s: "self-reported", icon: "said", en: "Self-reported", ar: "إفادة ذاتية", how_en: "You describe it", how_ar: "تصفها بنفسك" },
  { s: "evidence-attached", icon: "link", en: "Evidence attached", ar: "دليل مرفق", how_en: "You add a link", how_ar: "تضيف رابطاً" },
  { s: "awaiting-review", icon: "clock", en: "Awaiting review", ar: "بانتظار المراجعة", how_en: "You ask for a review", how_ar: "تطلب مراجعة" },
  { s: "reviewed", icon: "reviewed", en: "Reviewed against a stated rubric", ar: "روجِع وفق معايير معلنة", how_en: "A named person checks it", how_ar: "يراجعه شخص مسمّى" },
];

/** The evidence states as a ladder. `current` highlights one rung (optional). */
export function EvidenceLadder({ current }: { current?: EvidenceStatus }) {
  const { tr } = useBridge();
  return (
    <figure className="m-0">
      <ol aria-label={tr("How a skill's evidence state changes", "كيف تتغير حالة دليل المهارة")} className="grid gap-2 sm:grid-cols-4">
        {LADDER.map((r, i) => (
          <li key={r.s} aria-current={current === r.s ? "step" : undefined}
            className={`relative rounded-2xl border p-3 text-sm ${current === r.s ? "border-sage bg-sage-100/60" : "border-line bg-white"}`}>
            <span className="flex items-center gap-2 font-semibold text-teal"><Icon name={r.icon} className="size-4 text-sage-600" />{tr(r.en, r.ar)}</span>
            <span className="mt-0.5 block text-xs text-muted">{i + 1}. {tr(r.how_en, r.how_ar)}</span>
          </li>
        ))}
      </ol>
      <figcaption className="mt-2 text-xs text-muted">{tr("If a review finds something missing, the skill shows “Needs clarification” with the reviewer's reason. A review is not a certificate.", "إذا وجدت المراجعة نقصاً، تظهر المهارة «يحتاج إلى توضيح» مع سبب المراجِع. المراجعة ليست شهادة.")}</figcaption>
    </figure>
  );
}

/** A filled-cell count: `a` of `b` as squares, with the number as text. Static. */
export function CountBar({ a, b, label }: { a: number; b: number; label: string }) {
  return (
    <span className="mt-2 flex gap-1" role="img" aria-label={label}>
      {Array.from({ length: Math.max(b, 0) }, (_, i) => <span key={i} className={`h-2 flex-1 rounded-full ${i < a ? "bg-sage" : "bg-line"}`} />)}
    </span>
  );
}

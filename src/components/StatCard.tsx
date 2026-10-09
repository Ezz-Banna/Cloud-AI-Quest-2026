"use client";
// One sourced statistic: static number, plain label, period and population, and a visible, clickable source.
import { useBridge } from "./ProfileProvider";
import type { JordanStat } from "@/lib/data/jordan-stats";

export function StatCard({ s, compact }: { s: JordanStat; compact?: boolean }) {
  const { tr } = useBridge();
  return (
    <figure className={`m-0 h-full rounded-[1.25rem] border border-line bg-white ${compact ? "p-4" : "p-5"}`}>
      <p className={`font-bold leading-none text-teal ${compact ? "text-3xl" : "text-4xl"}`} dir="ltr">{s.value}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{tr(s.label_en, s.label_ar)}</p>
      <p className="mt-0.5 text-xs text-muted">{tr(s.period_en, s.period_ar)}</p>
      <figcaption className="mt-2 text-xs text-muted">
        {tr("Source", "المصدر")}: <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-teal">{tr(s.source_en, s.source_ar)}</a>
      </figcaption>
    </figure>
  );
}

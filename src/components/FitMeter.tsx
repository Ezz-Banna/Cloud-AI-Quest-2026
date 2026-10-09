"use client";
// Shows fit and information coverage as two separate things. The bar is filled only for the share of the
// person's priorities that could be checked; the rest is drawn as "unknown", so an incomplete record never
// looks more certain than a complete one.
import { useBridge } from "./ProfileProvider";

export const LIMITED_INFO = 0.75;

export function FitMeter({ fit, coverage, compact }: { fit: number; coverage: number; compact?: boolean }) {
  const { tr } = useBridge();
  const cov = Math.round(coverage * 100);
  const limited = coverage < LIMITED_INFO;
  const known = Math.round(fit * coverage);
  const label = tr(`Match on what we know: ${fit} of 100. Information available for ${cov}% of your priorities.`, `التوافق فيما نعرفه: ${fit} من 100. تتوفر معلومات عن ${cov}% من أولوياتك.`);
  if (compact) return <span className="shrink-0 text-end text-sm"><span className="font-bold text-teal">{fit}</span>{limited && <span className="block text-xs text-warn">{tr("limited info", "معلومات محدودة")}</span>}</span>;
  return (
    <div>
      <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-mist" role="img" aria-label={label}>
        <div className="h-full bg-sage" style={{ width: `${known}%` }} />
        <div className="h-full bg-sage/25" style={{ width: `${cov - known}%` }} />
        <div className="h-full" style={{ width: `${100 - cov}%`, backgroundImage: "repeating-linear-gradient(45deg, transparent 0 4px, rgb(0 0 0 / 0.08) 4px 6px)" }} />
      </div>
      <dl className="mt-1.5 grid grid-cols-2 gap-2 text-xs">
        <div><dt className="text-muted">{tr("Match on what we know", "التوافق فيما نعرفه")}</dt><dd className="font-bold text-teal">{fit} / 100</dd></div>
        <div><dt className="text-muted">{tr("Information available", "المعلومات المتوفرة")}</dt><dd className={`font-bold ${limited ? "text-warn" : "text-teal"}`}>{cov}%{limited && ` · ${tr("limited", "محدودة")}`}</dd></div>
      </dl>
    </div>
  );
}

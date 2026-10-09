"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBridge } from "./ProfileProvider";

type Stage = { id: "discover" | "empower" | "succeed"; href: string; en: string; ar: string; subEn: string; subAr: string };
const STAGES: Stage[] = [
  { id: "discover", href: "/discover", en: "Discover", ar: "اكتشف", subEn: "School to university", subAr: "من المدرسة إلى الجامعة" },
  { id: "empower", href: "/empower", en: "Empower", ar: "تمكَّن", subEn: "Student to opportunity", subAr: "من الطالب إلى الفرصة" },
  { id: "succeed", href: "/succeed", en: "Succeed", ar: "انجح", subEn: "Learning to employment", subAr: "من التعلم إلى العمل" },
];

export function JourneyIndicator() {
  const path = usePathname();
  const { progress, tr } = useBridge();
  const current = STAGES.findIndex((s) => path.startsWith(s.href));
  const done = [progress.discover_done, progress.empower_done, false];

  return (
    <nav aria-label={tr("Your journey", "رحلتك")} className="w-full">
      <ol className="flex items-stretch gap-1.5 sm:gap-3">
        {STAGES.map((s, i) => {
          const isCurrent = i === current;
          const isDone = done[i] && !isCurrent;
          const state = isCurrent ? tr("You are here", "أنت هنا") : isDone ? tr("Completed", "مكتمل") : tr("Up next", "التالي");
          return (
            <li key={s.id} className="flex flex-1 items-center gap-1.5 sm:gap-3 min-w-0">
              <Link href={s.href} aria-current={isCurrent ? "step" : undefined}
                className={`group flex flex-1 min-w-0 items-center gap-2 sm:gap-3 rounded-2xl px-2 py-2 sm:px-3 transition-colors ${isCurrent ? "bg-teal text-ivory" : "hover:bg-mist"}`}>
                <span aria-hidden="true" className={`grid size-7 sm:size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${isCurrent ? "bg-sand text-teal-900" : isDone ? "bg-sage text-white" : "border-2 border-line text-muted bg-white"}`}>
                  {isDone ? "✓" : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={`block truncate text-sm font-bold ${isCurrent ? "" : "text-teal"}`}>{tr(s.en, s.ar)}</span>
                  <span className={`hidden md:block truncate text-xs ${isCurrent ? "text-mist" : "text-muted"}`}>{tr(s.subEn, s.subAr)}</span>
                  <span className="sr-only">, {state}</span>
                </span>
              </Link>
              {i < STAGES.length - 1 && (
                <span aria-hidden="true" className={`hidden sm:block h-0.5 w-6 lg:w-12 shrink-0 rounded ${done[i] ? "bg-sage" : "bg-line"}`} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

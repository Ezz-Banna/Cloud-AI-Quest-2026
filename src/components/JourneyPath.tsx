"use client";
// School → University → Company, one column joined by a softly breathing line. Each stage is a button: the
// selected one grows a little, gets a glow, and reveals its sentence. Text lives in STAGES; colours and speed in
// globals.css under "Journey path" (--bc-journey-speed, --bc-journey-glow).
import { useState } from "react";
import { useBridge } from "./ProfileProvider";

type StageId = "school" | "university" | "company";
const STAGES: { id: StageId; img: string; en: string; ar: string; line_en: string; line_ar: string }[] = [
  { id: "school", img: "/journey/school.webp", en: "High School", ar: "المدرسة", line_en: "Build your foundation.", line_ar: "ابنِ أساسك." },
  { id: "university", img: "/journey/university.webp", en: "University", ar: "الجامعة", line_en: "Discover the best-fit university for your goals.", line_ar: "لاقي الجامعة اللي بتناسب أهدافك." },
  { id: "company", img: "/journey/company.webp", en: "Company", ar: "الشركة", line_en: "Turn your skills into a career.", line_ar: "حوّل مهاراتك لمسار مهني." },
];

export function JourneyPath({ initial = "university" }: { initial?: StageId }) {
  const { tr } = useBridge();
  const [active, setActive] = useState<StageId>(initial);
  return (
    <section aria-labelledby="journey-title" className="bc-journey mx-auto w-full max-w-[16rem] sm:max-w-[18rem]">
      <h2 id="journey-title" className="sr-only">{tr("From school to university to work", "من المدرسة للجامعة للشغل")}</h2>
      <div className="relative">
      <span aria-hidden="true" className="bc-journey-line" />
      <ol className="relative flex flex-col items-center gap-12">
        {STAGES.map((s, i) => {
          const on = s.id === active;
          return (
            <li key={s.id} className="relative z-10 flex w-full flex-col items-center">
              {i > 0 && <span aria-hidden="true" className="bc-journey-node" />}
              <button type="button" aria-pressed={on} aria-controls={`journey-${s.id}`} onClick={() => setActive(s.id)}
                className="bc-journey-stage w-full rounded-[1.25rem] border border-line bg-white/90 px-3 pb-2.5 pt-2 text-center" data-on={on}>
                {/* Decorative: the label below names the stage. */}
                <img src={s.img} alt="" width={240} height={112} loading="eager" className="mx-auto h-auto w-[78%] select-none" draggable={false} />
                <span className={`mt-1 block text-sm font-bold ${on ? "text-teal" : "text-sage-600"}`}>{tr(s.en, s.ar)}</span>
                <span id={`journey-${s.id}`} className="bc-journey-reveal" aria-live="polite">
                  <span className="overflow-hidden">
                    {on && <span className="bc-journey-line-text block pt-1 text-[0.95rem] leading-snug text-ink">{tr(s.line_en, s.line_ar)}</span>}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      </div>
    </section>
  );
}

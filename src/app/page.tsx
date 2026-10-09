"use client";
import Link from "next/link";
import { useState } from "react";
import { useBridge } from "@/components/ProfileProvider";
import { Icon, type IconName } from "@/components/Visuals";


type GoalId = "study" | "career";

// Geometry of "the next-step connection" in viewBox units. The HTML labels are placed with the same
// percentages, so the drawing and its text stay aligned at every width and mirror together in Arabic.
const W = 560;
const H = 320;
const START = { x: 84, y: 160 };
const GOAL_X = 350;
const GOAL_Y: Record<GoalId, number> = { study: 84, career: 236 };
const GOALS: GoalId[] = ["study", "career"];
const pathFor = (g: GoalId) => {
  const y = GOAL_Y[g];
  return `M${START.x + 15} ${START.y} C${START.x + 130} ${START.y}, ${GOAL_X - 120} ${y}, ${GOAL_X - 11} ${y}`;
};
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

function NextStepConnection({ active, intro }: { active: GoalId; intro: boolean }) {
  const { tr } = useBridge();
  const short: Record<GoalId, string> = {
    study: tr("Study options", "خيارات الدراسة"),
    career: tr("Career preparation", "الاستعداد للشغل"),
  };
  const next: Record<GoalId, string> = {
    study: tr("Compare two programs on yearly cost in JOD", "قارن برنامجين بالكلفة السنوية بالدينار"),
    career: tr("Turn a club event you helped organise into skills", "حوّل فعالية ساعدت بتنظيمها بالنادي لمهارات"),
  };
  const alt = tr(
    `Diagram: from "Start", two paths lead to Study options and Career preparation. Highlighted: ${short[active]}. Example: ${next[active]}.`,
    `رسم توضيحي: من «البداية» يتفرع مساران إلى خيارات الدراسة والاستعداد للشغل. المسار المميّز: ${short[active]}. مثال: ${next[active]}.`,
  );
  return (
    <figure className="bc-conn card m-0 p-4 sm:p-6">
      <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="bc-conn-svg absolute inset-0 size-full" role="img" aria-labelledby="bc-conn-title">
          <title id="bc-conn-title">{alt}</title>
          {GOALS.map((g) => <path key={`base-${g}`} d={pathFor(g)} className="bc-conn-base" />)}
          {GOALS.map((g) => (
            <path key={`on-${g}`} d={pathFor(g)} pathLength={1} data-on={g === active}
              className={`bc-conn-path${intro && g === "study" ? " bc-conn-intro" : ""}`} />
          ))}
          <circle cx={START.x} cy={START.y} r={15} className="bc-conn-start" />
          <circle cx={START.x} cy={START.y} r={6} className="bc-conn-start-core" />
          {GOALS.map((g) => <circle key={`n-${g}`} cx={GOAL_X} cy={GOAL_Y[g]} r={11} className="bc-conn-node" data-on={g === active} />)}
        </svg>
        {/* Visible labels: plain text from the first paint, never faded in. Hidden from assistive tech because the SVG title says the same. */}
        <div aria-hidden="true">
          <span className="absolute w-28 text-center text-sm font-bold leading-tight text-teal"
            style={{ insetInlineStart: `calc(${pct(START.x, W)} - 3.5rem)`, top: `calc(${pct(START.y, H)} + 1.5rem)` }}>
            {tr("Start", "البداية")}
          </span>
          {GOALS.map((g) => (
            <span key={`l-${g}`} data-on={g === active}
              className="bc-conn-label absolute -translate-y-1/2 text-sm font-semibold leading-tight"
              style={{ insetInlineStart: `calc(${pct(GOAL_X, W)} + 1.25rem)`, insetInlineEnd: 0, top: pct(GOAL_Y[g], H) }}>
              {short[g]}
            </span>
          ))}
        </div>
      </div>
      {/* One reserved row: the three example actions share one grid cell, so swapping them never shifts layout. */}
      <figcaption className="mt-3 grid min-h-[3.25rem]" aria-hidden="true">
        {GOALS.map((g) => (
          <p key={`x-${g}`} data-on={g === active}
            className={`bc-conn-next${intro && g === "study" ? " bc-conn-intro" : ""} col-start-1 row-start-1 m-0 self-center rounded-xl bg-sand-100 px-3 py-2 text-sm text-ink`}>
            <span className="font-semibold text-sand-700">{tr("For example", "مثلاً")} · </span>{next[g]}
          </p>
        ))}
      </figcaption>
    </figure>
  );
}

export default function Home() {
  const { tr } = useBridge();
  const [active, setActiveRaw] = useState<GoalId>("study");
  // Once the person picks a goal, the opening sequence is over for good and only the 300ms highlight transition runs.
  const [intro, setIntro] = useState(true);
  const setActive = (g: GoalId) => { setIntro(false); setActiveRaw(g); };

  const goals: { id: GoalId; href: string; icon: IconName; title: string; desc: string; start: string }[] = [
    {
      id: "study", href: "/discover", icon: "programs",
      title: tr("Find your study direction", "شو بدك تدرس؟"),
      desc: tr("Explore programs, compare costs and check funding options.", "استكشف التخصصات، قارن التكاليف، وشوف خيارات الدعم."),
      start: tr("Explore study options", "شوف خيارات الدراسة"),
    },
    {
      id: "career", href: "/empower", icon: "role",
      title: tr("Take a step towards work", "جاهز لخطوة نحو الشغل؟"),
      desc: tr("Find the skills in your experience and explore what roles ask for.", "اكتشف المهارات اللي بتظهرها تجاربك، وشوف شو بتطلب الوظائف."),
      start: tr("Explore career preparation", "حضّر خطوتك للشغل"),
    },
  ];

  return (
    <>
      <section aria-labelledby="hero-title" className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-6">
        <div className="min-w-0">
          <h1 id="hero-title" className="mt-3 text-4xl font-bold leading-tight tracking-tight text-teal sm:text-5xl ar:text-5xl ar:sm:text-6xl">
            {tr("What’s your next move?", "شو خطوتك الجايّة؟")}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            {tr("Figuring out what to study or how to start your career? Let’s explore your options.", "محتار شو تدرس أو كيف تبدأ مشوارك المهني؟ خلّينا نرتّب خياراتك.")}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#goals" className="btn-primary !px-7 !py-3 text-base"
              onClick={(e) => {
                const el = document.getElementById("goals");
                if (!el) return;
                e.preventDefault();
                el.scrollIntoView({ block: "start" });
                el.focus({ preventScroll: true });
              }}>
              {tr("Let’s start", "يلّا نبدأ")}
            </a>
            <Link href="/discover?demo=1" className="btn-secondary !px-7 !py-3 text-base">{tr("See an example", "شوف مثال")}</Link>
          </div>
          <p className="mt-3 text-sm text-muted">
            {tr("Lina is a made-up student for the demo. No sign-up needed.", "لينا طالبة افتراضية للتجربة. بدون تسجيل.")}
          </p>
        </div>
        <NextStepConnection active={active} intro={intro} />
      </section>

      <section id="goals" tabIndex={-1} aria-labelledby="goals-title" className="mt-12 scroll-mt-24 focus:outline-none">
        <h2 id="goals-title" className="h2">{tr("Where do you want to start?", "من وين بدك تبدأ؟")}</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {goals.map((g) => {
            const on = g.id === active;
            return (
              <li key={g.id} className={`card flex flex-col p-6 transition-[border-color,box-shadow] duration-300 ${on ? "!border-sage ring-2 ring-sage/40" : ""}`}>
                <span className="grid size-11 place-items-center rounded-full bg-mist text-sage-600"><Icon name={g.icon} className="size-6" /></span>
                <h3 className="mt-3 text-xl font-bold text-teal">{g.title}</h3>
                <p className="mt-2 flex-1 text-ink">{g.desc}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link href={g.href} onFocus={() => setActive(g.id)} className="btn-primary">
                    {g.start} <span aria-hidden="true" className="inline-block rtl:-scale-x-100">→</span>
                  </Link>
                  <button type="button" aria-pressed={on} onClick={() => setActive(g.id)} className="btn-ghost !px-3 text-sm">
                    <span aria-hidden="true" className={`inline-block size-2.5 shrink-0 rounded-full border-2 border-sage transition-colors duration-300 ${on ? "bg-teal" : "bg-white"}`} />
                    {tr("Show this path", "شوف المسار")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

    </>
  );
}

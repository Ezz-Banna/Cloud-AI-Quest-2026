"use client";
import Link from "next/link";
import { useState } from "react";
import { useBridge } from "@/components/ProfileProvider";
import { Icon, type IconName } from "@/components/Visuals";
import { StatCard } from "@/components/StatCard";
import { JORDAN_STATS } from "@/lib/data/jordan-stats";

const HOME_STATS = JORDAN_STATS.filter((s) => s.home);

type GoalId = "programs" | "skills" | "role";

// Geometry of "the next-step connection" in viewBox units. The HTML labels are placed with the same
// percentages, so the drawing and its text stay aligned at every width and mirror together in Arabic.
const W = 560;
const H = 320;
const START = { x: 84, y: 160 };
const GOAL_X = 350;
const GOAL_Y: Record<GoalId, number> = { programs: 56, skills: 160, role: 264 };
const GOALS: GoalId[] = ["programs", "skills", "role"];
const pathFor = (g: GoalId) => {
  const y = GOAL_Y[g];
  return `M${START.x + 15} ${START.y} C${START.x + 130} ${START.y}, ${GOAL_X - 120} ${y}, ${GOAL_X - 11} ${y}`;
};
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

function NextStepConnection({ active, intro }: { active: GoalId; intro: boolean }) {
  const { tr } = useBridge();
  const short: Record<GoalId, string> = {
    programs: tr("Programs", "البرامج"),
    skills: tr("Skills", "المهارات"),
    role: tr("Learning & role", "التعلّم والدور"),
  };
  const next: Record<GoalId, string> = {
    programs: tr("Next: compare 2 programs on yearly cost", "التالي: قارن بين برنامجين في الكلفة السنوية"),
    skills: tr("Next: confirm the skills quoted from your words", "التالي: أكّد المهارات المقتبسة من كلماتك"),
    role: tr("Next: one practical task for a missing requirement", "التالي: مهمة عملية لمتطلب ينقصك"),
  };
  const alt = tr(
    `Diagram: from "You are here", three paths lead to Programs, Skills, and Learning & role. Highlighted path: ${short[active]}. Example: ${next[active]}.`,
    `رسم توضيحي: من «أنت هنا» تتفرع ثلاثة مسارات إلى البرامج والمهارات والتعلّم والدور. المسار المميّز: ${short[active]}. مثال: ${next[active]}.`,
  );
  return (
    <figure className="bc-conn card m-0 p-4 sm:p-6">
      <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="bc-conn-svg absolute inset-0 size-full" role="img" aria-labelledby="bc-conn-title">
          <title id="bc-conn-title">{alt}</title>
          {GOALS.map((g) => <path key={`base-${g}`} d={pathFor(g)} className="bc-conn-base" />)}
          {GOALS.map((g) => (
            <path key={`on-${g}`} d={pathFor(g)} pathLength={1} data-on={g === active}
              className={`bc-conn-path${intro && g === "programs" ? " bc-conn-intro" : ""}`} />
          ))}
          <circle cx={START.x} cy={START.y} r={15} className="bc-conn-start" />
          <circle cx={START.x} cy={START.y} r={6} className="bc-conn-start-core" />
          {GOALS.map((g) => <circle key={`n-${g}`} cx={GOAL_X} cy={GOAL_Y[g]} r={11} className="bc-conn-node" data-on={g === active} />)}
        </svg>
        {/* Visible labels: plain text from the first paint, never faded in. Hidden from assistive tech because the SVG title says the same. */}
        <div aria-hidden="true">
          <span className="absolute w-28 text-center text-sm font-bold leading-tight text-teal"
            style={{ insetInlineStart: `calc(${pct(START.x, W)} - 3.5rem)`, top: `calc(${pct(START.y, H)} + 1.5rem)` }}>
            {tr("You are here", "أنت هنا")}
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
            className={`bc-conn-next${intro && g === "programs" ? " bc-conn-intro" : ""} col-start-1 row-start-1 m-0 self-center rounded-xl bg-sand-100 px-3 py-2 text-sm text-ink`}>
            <span className="font-semibold text-sand-700">{tr("Example", "مثال")} · </span>{next[g]}
          </p>
        ))}
      </figcaption>
    </figure>
  );
}

export default function Home() {
  const { tr } = useBridge();
  const [active, setActiveRaw] = useState<GoalId>("programs");
  // Once the person picks a goal, the opening sequence is over for good and only the 300ms highlight transition runs.
  const [intro, setIntro] = useState(true);
  const setActive = (g: GoalId) => { setIntro(false); setActiveRaw(g); };

  const goals: { id: GoalId; href: string; icon: IconName; title: string; who: string; get: string[]; start: string }[] = [
    {
      id: "programs", href: "/discover", icon: "programs",
      title: tr("Choose a university program", "اختيار برنامج جامعي"),
      who: tr("Tawjihi students", "طلبة التوجيهي"),
      get: [tr("Admission minimum check, with source", "فحص الحد الأدنى للقبول مع المصدر"), tr("Yearly cost in JOD, dated", "الكلفة السنوية بالدينار مع التاريخ"), tr("Why it fits you (not an admission chance)", "سبب ملاءمته لك (ليس فرصة قبول)")],
      start: tr("Start with programs", "ابدأ بالبرامج"),
    },
    {
      id: "skills", href: "/empower", icon: "skills",
      title: tr("Describe my experience as skills", "وصف خبرتي كمهارات"),
      who: tr("Students and graduates", "الطلبة والخريجون"),
      get: [tr("Skills quoted from your own words", "مهارات مقتبسة من كلماتك"), tr("You choose what is kept", "أنت تختار ما يُحفظ"), tr("Links shown as attached, not verified", "الروابط تظهر كمرفقة لا موثّقة")],
      start: tr("Start with skills", "ابدأ بالمهارات"),
    },
    {
      id: "role", href: "/succeed", icon: "role",
      title: tr("Compare my experience with a role", "مقارنة خبرتي بدور وظيفي"),
      who: tr("Anyone preparing for work", "كل من يستعد للعمل"),
      get: [tr("What you already cover", "ما تغطيه خبرتك"), tr("What the role still asks for", "ما يطلبه الدور بعد"), tr("One practical next step", "خطوة عملية تالية واحدة")],
      start: tr("Start with a role", "ابدأ بدور وظيفي"),
    },
  ];

  const trust: [IconName, string, string][] = [
    ["source", tr("Sources and dates", "المصادر والتواريخ"), tr("Every minimum and cost links to where it came from.", "كل حد أدنى وكلفة مرتبط بمصدره.")],
    ["reasons", tr("Reasons, not scores", "أسباب لا أرقام"), tr("Each suggestion says why, so you can disagree.", "كل اقتراح يذكر سببه، فتستطيع الاعتراض.")],
    ["confirm", tr("You confirm first", "أنت تؤكّد أولاً"), tr("You check what was read, and whether AI or rules read it.", "تراجع ما قُرئ، وهل قرأه الذكاء الاصطناعي أم القواعد.")],
  ];

  return (
    <>
      <section aria-labelledby="hero-title" className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-6">
        <div className="min-w-0">
          <h1 id="hero-title" className="mt-3 text-4xl font-bold leading-tight tracking-tight text-teal sm:text-5xl">
            {tr("Your next step, made clearer.", "خطوتك التالية، بوضوح أكبر.")}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            {tr("Pick the decision in front of you. No sign-up, in Arabic or English.", "اختر القرار الذي أمامك. دون تسجيل، بالعربية أو الإنجليزية.")}
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
              {tr("Find my next step", "اعرف خطوتك التالية")}
            </a>
            <Link href="/discover?demo=1" className="btn-secondary !px-7 !py-3 text-base">{tr("Explore an example", "استكشف مثالاً")}</Link>
          </div>
          <p className="mt-3 text-sm text-muted">
            {tr("The example uses Lina, a synthetic student.", "يستخدم المثال «لينا»، وهي طالبة مصطنعة.")}
          </p>
        </div>
        <NextStepConnection active={active} intro={intro} />
      </section>

      <section id="goals" tabIndex={-1} aria-labelledby="goals-title" className="mt-12 scroll-mt-24 focus:outline-none">
        <h2 id="goals-title" className="h2">{tr("Where would you like to start?", "من أين تودّ أن تبدأ؟")}</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {goals.map((g) => {
            const on = g.id === active;
            return (
              <li key={g.id} className={`card flex flex-col p-5 transition-[border-color,box-shadow] duration-300 ${on ? "!border-sage ring-2 ring-sage/40" : ""}`}>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-600"><Icon name={g.icon} className="size-5" />{g.who}</p>
                <h3 className="mt-2 text-lg font-bold text-teal">{g.title}</h3>
                <ul className="mt-3 flex-1 space-y-1.5 text-sm text-ink" aria-label={tr("You receive", "ستحصل على")}>
                  {g.get.map((x) => <li key={x} className="flex gap-2"><span aria-hidden="true" className="font-bold text-ok">✓</span>{x}</li>)}
                </ul>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link href={g.href} onFocus={() => setActive(g.id)} className="btn-primary">
                    {g.start} <span aria-hidden="true" className="inline-block rtl:-scale-x-100">→</span>
                  </Link>
                  <button type="button" aria-pressed={on} onClick={() => setActive(g.id)} className="btn-ghost !px-3 text-sm">
                    <span aria-hidden="true" className={`inline-block size-2.5 shrink-0 rounded-full border-2 border-sage transition-colors duration-300 ${on ? "bg-teal" : "bg-white"}`} />
                    {tr("Show this path", "اعرض هذا المسار")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {HOME_STATS.length > 0 && (
        <section aria-labelledby="ctx-title" className="mt-12">
          <h2 id="ctx-title" className="h2">{tr("Why guidance matters in Jordan", "لماذا يهم الإرشاد في الأردن")}</h2>
          <div className="mt-4 grid items-center gap-4 sm:grid-cols-[minmax(0,26rem)_1fr]">
            <StatCard s={HOME_STATS[0]} compact />
            <p className="text-sm"><Link href="/how" className="font-semibold text-teal underline underline-offset-2">{tr("More Jordanian context, with sources", "مزيد من السياق الأردني مع المصادر")} <span aria-hidden="true" className="inline-block rtl:-scale-x-100">→</span></Link></p>
          </div>
        </section>
      )}

      <section aria-labelledby="trust-title" className="mt-14">
        <h2 id="trust-title" className="h2">{tr("Guidance you can check", "إرشاد يمكنك التحقق منه")}</h2>
        <ul className="mt-5 grid gap-4 md:grid-cols-3">
          {trust.map(([icon, h, b]) => (
            <li key={h} className="flex gap-3 rounded-[1.25rem] bg-mist p-5">
              <Icon name={icon} className="mt-0.5 size-6 text-sage-600" />
              <div><h3 className="font-bold text-teal">{h}</h3><p className="mt-1 text-sm text-muted">{b}</p></div>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm"><Link href="/how" className="font-semibold text-teal underline underline-offset-2">{tr("How Bridgecom works", "كيف يعمل بريدجكوم")} <span aria-hidden="true" className="inline-block rtl:-scale-x-100">→</span></Link></p>
      </section>
    </>
  );
}

"use client";
import Link from "next/link";
import { useState } from "react";
import { useBridge } from "@/components/ProfileProvider";

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

  const goals: { id: GoalId; href: string; title: string; who: string; get: string; start: string }[] = [
    {
      id: "programs", href: "/discover",
      title: tr("Choose a university program", "اختيار برنامج جامعي"),
      who: tr("For Tawjihi students and anyone weighing a degree.", "لطلبة التوجيهي ولكل من يفكّر في دراسة جامعية."),
      get: tr("Programs whose published admission minimum you meet, the yearly cost with its source and date, and why each one fits you. Fit is not an admission chance.",
        "برامج تستوفي حدّها الأدنى المعلن للقبول، وكلفتها السنوية مع مصدرها وتاريخها، وسبب ملاءمة كلٍّ منها لك. الملاءمة ليست فرصة قبول."),
      start: tr("Start with programs", "ابدأ بالبرامج"),
    },
    {
      id: "skills", href: "/empower",
      title: tr("Describe my experience as skills", "وصف خبرتي كمهارات"),
      who: tr("For students and graduates with projects, volunteering or work to show.", "للطلبة والخريجين ممن لديهم مشاريع أو تطوّع أو عمل."),
      get: tr("Suggested skills, each quoting your own words. You confirm what is kept. Links you add are shown as attached, not verified.",
        "مهارات مقترحة، كلٌّ منها مقتبس من كلماتك، وأنت من يؤكّد ما يُحفظ. الروابط التي تضيفها تظهر كأدلة مرفقة، لا موثّقة."),
      start: tr("Start with skills", "ابدأ بالمهارات"),
    },
    {
      id: "role", href: "/succeed",
      title: tr("Compare my experience with a role", "مقارنة خبرتي بدور وظيفي"),
      who: tr("For anyone preparing for a specific kind of work.", "لكل من يستعد لنوع محدد من العمل."),
      get: tr("What your recorded experience already covers, what the role still asks for, and one practical next step.",
        "ما تغطيه خبرتك المسجّلة، وما يتطلبه الدور بعد، وخطوة عملية واحدة تالية."),
      start: tr("Start with a role", "ابدأ بدور وظيفي"),
    },
  ];

  const trust = [
    [tr("Sources and dates shown", "المصادر والتواريخ ظاهرة"),
      tr("Admission minimums and costs come from published records and are shown with their source and the date they were collected.",
        "الحدود الدنيا للقبول والكلف مأخوذة من سجلات منشورة، وتظهر مع مصدرها وتاريخ جمعها.")],
    [tr("Reasons shown", "الأسباب ظاهرة"),
      tr("Every suggestion lists why it was made, so you can disagree with a specific reason instead of trusting a score.",
        "كل اقتراح يذكر أسبابه، فتستطيع أن تعترض على سبب بعينه بدل أن تثق برقم.")],
    [tr("You confirm what was read", "أنت تؤكّد ما فُهم منك"),
      tr("Before your words are used, you see what the system took from them and can correct it. Results say whether AI or keyword rules produced them.",
        "قبل استخدام كلماتك، ترى ما استخلصه النظام منها ويمكنك تصحيحه. وتوضّح النتائج إن كانت من الذكاء الاصطناعي أو من قواعد الكلمات المفتاحية.")],
  ];

  return (
    <>
      <section aria-labelledby="hero-title" className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-6">
        <div className="min-w-0">
          <p className="eyebrow">{tr("Education and skills guidance for Jordan", "إرشاد تعليمي ومهاري في الأردن")}</p>
          <h1 id="hero-title" className="mt-3 text-4xl font-bold leading-tight tracking-tight text-teal sm:text-5xl">
            {tr("Your next step, made clearer.", "خطوتك التالية، بوضوح أكبر.")}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            {tr("For students, graduates and anyone in Jordan without access to one-to-one guidance. Pick the decision in front of you: which university program to consider, how to describe the skills you already have, or what a role still asks of you.",
              "للطلبة والخريجين ولكل من في الأردن لا يتاح له إرشاد فردي. اختر القرار الذي أمامك: أيّ برنامج جامعي تدرسه، أو كيف تصف المهارات التي لديك، أو ما الذي ما زال يتطلبه منك دور وظيفي.")}
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
            {tr("The example uses Lina, a synthetic demo student. No sign-up needed.", "يستخدم المثال «لينا»، وهي طالبة تجريبية مصطنعة. لا حاجة إلى التسجيل.")}
          </p>
        </div>
        <NextStepConnection active={active} intro={intro} />
      </section>

      <section id="goals" tabIndex={-1} aria-labelledby="goals-title" className="mt-12 scroll-mt-24 focus:outline-none">
        <h2 id="goals-title" className="h2">{tr("Where would you like to start?", "من أين تودّ أن تبدأ؟")}</h2>
        <p className="mt-2 max-w-2xl text-muted">
          {tr("Start at the stage you are at now. Each step works on its own, and your answers stay on your device.",
            "ابدأ من المرحلة التي أنت فيها الآن. كل خطوة تعمل وحدها، وإجاباتك تبقى على جهازك.")}
        </p>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {goals.map((g) => {
            const on = g.id === active;
            return (
              <li key={g.id} className={`card flex flex-col p-5 transition-[border-color,box-shadow] duration-300 ${on ? "!border-sage ring-2 ring-sage/40" : ""}`}>
                <h3 className="text-lg font-bold text-teal">{g.title}</h3>
                <p className="mt-1 text-sm text-muted">{g.who}</p>
                <p className="mt-3 flex-1 text-sm text-ink"><span className="font-semibold text-teal">{tr("You receive: ", "ستحصل على: ")}</span>{g.get}</p>
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

      <section aria-labelledby="trust-title" className="mt-14">
        <h2 id="trust-title" className="h2">{tr("Guidance you can check", "إرشاد يمكنك التحقق منه")}</h2>
        <ul className="mt-5 grid gap-4 md:grid-cols-3">
          {trust.map(([h, b]) => (
            <li key={h} className="rounded-[1.25rem] bg-mist p-5">
              <h3 className="font-bold text-teal">{h}</h3>
              <p className="mt-2 text-sm text-muted">{b}</p>
            </li>
          ))}
        </ul>
        <p className="mt-5 max-w-3xl text-sm text-muted">
          {tr("Bridgecom gives guidance, not admission or hiring decisions. Employers and the demo student in this prototype are synthetic.",
            "يقدّم بريدجكوم إرشاداً، لا قرارات قبول أو توظيف. أصحاب العمل والطالبة التجريبية في هذا النموذج الأولي بيانات مصطنعة.")}
          {" "}
          <Link href="/employer" className="underline underline-offset-2 hover:text-teal">{tr("Employer access", "دخول أصحاب العمل")}</Link>
        </p>
      </section>
    </>
  );
}

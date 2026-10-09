"use client";
import Link from "next/link";
import { useBridge } from "@/components/ProfileProvider";
import { Icon, type IconName } from "@/components/Visuals";
import { JourneyPath } from "@/components/JourneyPath";


type GoalId = "study" | "career";

export default function Home() {
  const { tr } = useBridge();
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
      <section aria-labelledby="hero-title" className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12 lg:py-6">
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
        <JourneyPath />
      </section>

      <section id="goals" tabIndex={-1} aria-labelledby="goals-title" className="mt-12 scroll-mt-24 focus:outline-none">
        <h2 id="goals-title" className="h2">{tr("Where do you want to start?", "من وين بدك تبدأ؟")}</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {goals.map((g) => {
            return (
              <li key={g.id} className="card flex flex-col p-6">
                <span className="grid size-11 place-items-center rounded-full bg-mist text-sage-600"><Icon name={g.icon} className="size-6" /></span>
                <h3 className="mt-3 text-xl font-bold text-teal">{g.title}</h3>
                <p className="mt-2 flex-1 text-ink">{g.desc}</p>
                <div className="mt-5">
                  <Link href={g.href} className="btn-primary">
                    {g.start} <span aria-hidden="true" className="inline-block rtl:-scale-x-100">→</span>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

    </>
  );
}

"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { IntroAnimation } from "@/components/IntroAnimation";
import { useBridge } from "@/components/ProfileProvider";

function Intro() {
  const sp = useSearchParams();
  return <IntroAnimation force={sp.get("intro") === "1"} />;
}

export default function Home() {
  const { tr } = useBridge();
  const stages = [
    { n: 1, href: "/discover", title: tr("Discover", "اكتشف"), sub: tr("School to university", "من المدرسة إلى الجامعة"),
      body: tr("Tell us about your Tawjihi results, interests, budget and dreams in a short conversation. See which programs you meet the published minimums for, what they cost, and why each one fits.", "حدّثنا عن نتائج التوجيهي واهتماماتك وميزانيتك وأحلامك في محادثة قصيرة. اعرف البرامج التي تحقق حدودها الدنيا المعلنة، وكلفتها، ولماذا يناسبك كل منها.") },
    { n: 2, href: "/empower", title: tr("Empower", "تمكَّن"), sub: tr("Student to opportunity", "من الطالب إلى الفرصة"),
      body: tr("Show what exams can't: projects, volunteering, certificates. AI helps you describe the skills they demonstrate, using only what you actually did, and finds scholarships worth checking.", "أظهر ما لا تُظهره الامتحانات: مشاريعك وتطوعك وشهاداتك. يساعدك الذكاء الاصطناعي على وصف المهارات التي تثبتها، بالاعتماد فقط على ما قمت به فعلاً، ويقترح منحاً تستحق التحقق منها.") },
    { n: 3, href: "/succeed", title: tr("Succeed", "انجح"), sub: tr("Learning to employment", "من التعلم إلى العمل"),
      body: tr("Compare your evidenced skills with what employers ask for. Get a gap analysis, a learning path in the right order, and practical tasks that prove each skill.", "قارن مهاراتك الموثّقة بما يطلبه أصحاب العمل. احصل على تحليل للفجوات، ومسار تعلّم بالترتيب الصحيح، ومهام عملية تثبت كل مهارة.") },
  ];
  return (
    <>
      <Suspense fallback={null}><Intro /></Suspense>
      <section className="grid items-center gap-10 py-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="bc-rise">
          <p className="eyebrow">{tr("Smart Society & Public Services · Jordan", "مجتمع ذكي وخدمات عامة · الأردن")}</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-teal sm:text-5xl">
            {tr("From where you are to where you could be.", "من حيث أنت، إلى حيث يمكن أن تكون.")}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            {tr("Bridgecom is one profile that grows with you: choosing a university, proving your abilities beyond exam scores, and getting ready for real jobs in Jordan. Every recommendation shows its reasons and its sources.",
              "بريدجكوم ملف واحد ينمو معك: من اختيار الجامعة، إلى إثبات قدراتك بما يتجاوز علامات الامتحانات، إلى الاستعداد لوظائف حقيقية في الأردن. كل توصية تُظهر أسبابها ومصادرها.")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/discover" className="btn-primary !px-7 !py-3 text-base">{tr("Start my journey", "ابدأ رحلتي")}</Link>
            <Link href="/employer" className="btn-secondary !px-7 !py-3 text-base">{tr("I'm an employer", "أنا صاحب عمل")}</Link>
          </div>
        </div>
        <div className="card relative overflow-hidden p-6" aria-hidden="true">
          <svg viewBox="0 0 400 220" className="w-full">
            <path d="M0 220 L0 120 Q60 95 120 110 L120 220 Z" fill="#6F9C94" />
            <path d="M400 220 L400 120 Q340 95 280 110 L280 220 Z" fill="#6F9C94" />
            <path d="M120 110 Q200 40 280 110" fill="none" stroke="#264653" strokeWidth="5" strokeLinecap="round" />
            <line x1="120" y1="112" x2="280" y2="112" stroke="#264653" strokeWidth="6" strokeLinecap="round" />
            {[150, 175, 200, 225, 250].map((x) => <line key={x} x1={x} x2={x} y1={112} y2={x === 200 ? 75 : x === 175 || x === 225 ? 80 : 92} stroke="#264653" strokeWidth="2.5" />)}
            <circle cx="60" cy="96" r="7" fill="#D2A679" /><text x="44" y="80" fontSize="12" fill="#264653" fontWeight="700">School</text>
            <circle cx="200" cy="62" r="7" fill="#D2A679" /><text x="172" y="46" fontSize="12" fill="#264653" fontWeight="700">University</text>
            <circle cx="340" cy="96" r="7" fill="#D2A679" /><text x="326" y="80" fontSize="12" fill="#264653" fontWeight="700">Work</text>
          </svg>
          <p className="mt-2 text-center text-sm text-muted">{tr("One profile. Three transitions. Fully explained.", "ملف واحد. ثلاث مراحل انتقال. كل شيء مُفسَّر.")}</p>
        </div>
      </section>

      <section aria-labelledby="stages" className="mt-14">
        <h2 id="stages" className="sr-only">{tr("The three stages", "المراحل الثلاث")}</h2>
        <ol className="grid gap-5 md:grid-cols-3">
          {stages.map((s) => (
            <li key={s.n} className="card flex flex-col p-6">
              <span className="grid size-10 place-items-center rounded-full bg-mist font-bold text-teal">{s.n}</span>
              <h3 className="mt-4 text-xl font-bold text-teal">{s.title}</h3>
              <p className="text-sm font-semibold text-sage-600">{s.sub}</p>
              <p className="mt-3 flex-1 text-muted">{s.body}</p>
              <Link href={s.href} className="btn-ghost mt-4 self-start !px-0">{tr("Open", "افتح")} {s.title} →</Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14 grid gap-5 md:grid-cols-3">
        {[
          [tr("Eligibility is never guessed", "لا تخمين في الأهلية"), tr("Admission checks use published minimums with their year and source. The AI never decides if you can be admitted.", "يعتمد فحص القبول على الحدود الدنيا المنشورة مع سنتها ومصدرها. الذكاء الاصطناعي لا يقرر قبولك.")],
          [tr("Your claims stay yours", "إفاداتك تبقى لك"), tr("AI suggests skills only with a quote from what you wrote. Nothing is marked verified unless evidence supports it.", "يقترح الذكاء الاصطناعي المهارات فقط مع اقتباس مما كتبته. لا شيء يُعلَّم كموثّق دون دليل.")],
          [tr("Private by default", "خصوصية افتراضية"), tr("Your profile is stored on your device. Employers see your skills only if you choose to share them.", "يُحفظ ملفك على جهازك. لا يرى أصحاب العمل مهاراتك إلا إذا اخترت مشاركتها.")],
        ].map(([h, b]) => (
          <div key={h} className="rounded-[var(--radius-card)] bg-mist p-6">
            <h3 className="font-bold text-teal">{h}</h3>
            <p className="mt-2 text-sm text-muted">{b}</p>
          </div>
        ))}
      </section>
    </>
  );
}

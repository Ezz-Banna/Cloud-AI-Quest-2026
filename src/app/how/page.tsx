"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useBridge } from "@/components/ProfileProvider";
import { EvidenceLadder, Icon, type IconName } from "@/components/Visuals";
import { StatCard } from "@/components/StatCard";
import { JORDAN_STATS } from "@/lib/data/jordan-stats";

export default function How() {
  const { tr } = useBridge();
  const [ai, setAi] = useState<boolean | null>(null);
  useEffect(() => { fetch("/api/status").then((r) => r.json()).then((s) => setAi(!!s.ai)).catch(() => setAi(null)); }, []);

  const flow: { icon: IconName; h: string; who: string }[] = [
    { icon: "said", h: tr("Your words", "كلماتك"), who: tr("A posting, an achievement or your answers", "إعلان أو إنجاز أو إجاباتك") },
    { icon: "read", h: tr("Read", "القراءة"), who: ai ? tr("AI model, checked by rules", "نموذج ذكاء اصطناعي تدققه القواعد") : tr("Keyword rules", "قواعد الكلمات المفتاحية") },
    { icon: "confirm", h: tr("You confirm", "تأكيدك"), who: tr("Fix anything misread", "صحّح ما أُسيء فهمه") },
    { icon: "rules", h: tr("Fixed rules compare", "قواعد ثابتة تقارن"), who: tr("Eligibility, cost, requirements", "الأهلية والكلفة والمتطلبات") },
    { icon: "source", h: tr("Result", "النتيجة"), who: tr("With reasons and sources", "مع الأسباب والمصادر") },
  ];

  type Row = [string, "live" | "sim" | "planned", string];
  const rows: Row[] = [
    [tr("Program minimums, costs and fit from sourced records", "الحدود الدنيا والكلف والملاءمة من سجلات موثّقة المصدر"), "live", tr("Subset: 11 universities, 44 programs", "مجموعة جزئية: 11 جامعة و44 برنامجاً")],
    [tr("Reading postings and achievements (English and Arabic)", "قراءة الإعلانات والإنجازات (بالعربية والإنجليزية)"), "live", ai === null ? "…" : ai ? tr("AI model on", "نموذج الذكاء الاصطناعي مفعّل") : tr("Keyword rules; AI model off", "قواعد الكلمات المفتاحية؛ الذكاء الاصطناعي متوقف")],
    [tr("Scholarships and courses, linked to official pages", "المنح والدورات مع روابط صفحاتها الرسمية"), "live", tr("13 support programs, 45 courses", "13 برنامج دعم و45 دورة")],
    [tr("Human review of submitted work", "المراجعة البشرية للأعمال المقدّمة"), "sim", tr("Bridgecom team, not outside assessors", "فريق بريدجكوم، لا مقيّمون خارجيون")],
    [tr("Employers, roles and the demo student Lina", "أصحاب العمل والأدوار والطالبة التجريبية لينا"), "sim", tr("Synthetic, labelled", "مصطنعة ومعلَّمة")],
    [tr("Accounts, partner reviewers, verified employers", "الحسابات والمراجعون الشركاء وأصحاب العمل الموثّقون"), "planned", tr("Not built", "غير مبنية")],
  ];
  const tag = { live: [tr("Live", "يعمل"), "bg-ok-100 text-ok"], sim: [tr("Simulated", "محاكاة"), "bg-sand-100 text-sand-700"], planned: [tr("Planned", "مخطط"), "bg-mist text-muted"] } as const;

  return (
    <div className="space-y-12">
      <div>
        <h1 className="h1">{tr("How Bridgecom works", "كيف يعمل بريدجكوم")}</h1>
        <p className="mt-2 max-w-2xl text-muted">{tr("Guidance you can check: what it uses, who decides, and what is still a demo.", "إرشاد يمكنك التحقق منه: ما الذي يستخدمه، ومن يقرّر، وما الذي ما زال تجريبياً.")}</p>
      </div>

      {JORDAN_STATS.length > 0 && (
        <section aria-labelledby="why-h">
          <h2 id="why-h" className="h2">{tr("Why guidance matters in Jordan", "لماذا يهم الإرشاد في الأردن")}</h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {JORDAN_STATS.map((s) => <li key={s.id}><StatCard s={s} /></li>)}
          </ul>
          <p className="mt-3 max-w-3xl text-xs text-muted">{tr("National figures for context. They describe Jordan as a whole, not Bridgecom users, and Bridgecom has not measured any effect on them.", "أرقام وطنية للسياق. تصف الأردن ككل لا مستخدمي بريدجكوم، ولم يقِس بريدجكوم أي أثر عليها.")}</p>
        </section>
      )}

      <section aria-labelledby="flow-h">
        <h2 id="flow-h" className="h2">{tr("From your words to a result", "من كلماتك إلى النتيجة")}</h2>
        <ol className="mt-4 grid gap-2 md:grid-cols-5" aria-label={tr("Steps from your words to a result", "الخطوات من كلماتك إلى النتيجة")}>
          {flow.map((f, i) => (
            <li key={f.h} className="flex items-start gap-2 md:flex-col">
              <div className="flex w-full items-start gap-3 rounded-2xl border border-line bg-white p-4 md:flex-col md:gap-2">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-mist text-teal"><Icon name={f.icon} className="size-5" /></span>
                <div><p className="font-bold text-teal">{i + 1}. {f.h}</p><p className="text-sm text-muted">{f.who}</p></div>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-muted">{tr("The AI model, when on, only reads and phrases. It never decides eligibility, cost or a comparison.", "نموذج الذكاء الاصطناعي، عند تفعيله، يقرأ ويصوغ فقط. لا يقرّر الأهلية أو الكلفة أو المقارنة.")}</p>
      </section>

      <section aria-labelledby="ev-h">
        <h2 id="ev-h" className="h2">{tr("What a skill's label means", "ماذا تعني حالة المهارة")}</h2>
        <div className="mt-4"><EvidenceLadder /></div>
      </section>

      <section aria-labelledby="real-h">
        <h2 id="real-h" className="h2">{tr("What is live, simulated or planned", "ما الذي يعمل، وما المحاكى، وما المخطط")}</h2>
        <div className="card mt-4 overflow-x-auto" tabIndex={0} role="region" aria-labelledby="real-h">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
              <th scope="col" className="p-3 text-start">{tr("Capability", "القدرة")}</th><th scope="col" className="p-3 text-start">{tr("Status", "الحالة")}</th><th scope="col" className="p-3 text-start">{tr("Detail", "التفاصيل")}</th>
            </tr></thead>
            <tbody>{rows.map(([c, st, d]) => (
              <tr key={c} className="border-b border-line last:border-0">
                <th scope="row" className="p-3 text-start font-semibold text-teal">{c}</th>
                <td className="p-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tag[st][1]}`}>{tag[st][0]}</span></td>
                <td className="p-3 text-muted">{d}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <p className="mt-3 text-sm"><Link href="/data" className="font-semibold text-teal underline underline-offset-2">{tr("See every program record and its source", "اطّلع على كل سجل برنامج ومصدره")}</Link></p>
      </section>
    </div>
  );
}

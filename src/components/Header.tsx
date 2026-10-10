"use client";
import Link from "next/link";
import { Wordmark } from "./Logo";
import { JourneyIndicator } from "./JourneyIndicator";
import { useBridge } from "./ProfileProvider";
import { usePathname } from "next/navigation";

export function Header() {
  const { lang, setLang, tr } = useBridge();
  const path = usePathname();
  const inJourney = ["/discover", "/empower", "/succeed"].some((p) => path.startsWith(p));
  const nav = [
    { href: "/discover", en: "Study options", ar: "خيارات الدراسة", on: path.startsWith("/discover") || path.startsWith("/compare") },
    { href: "/empower", en: "Career preparation", ar: "الاستعداد للشغل", on: path.startsWith("/empower") || path.startsWith("/succeed") },
    { href: "/dashboard", en: "My plan", ar: "خطتي", on: path.startsWith("/dashboard") },
  ];
  const links = (cls: string) => nav.map((n) => (
    <Link key={n.href} href={n.href} aria-current={n.on ? "page" : undefined} className={`${cls} ${n.on ? "!text-teal underline decoration-sage decoration-2 underline-offset-8" : ""}`}>{tr(n.en, n.ar)}</Link>
  ));
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ivory/95 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-2 btn-primary">{tr("Skip to content", "انتقل إلى المحتوى")}</a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="min-w-0 rounded-xl"><Wordmark descriptor={tr("Your next step, clearer.", "خطوتك الجايّة أوضح.")} /></Link>
        <nav aria-label={tr("Main", "القائمة الرئيسية")} className="hidden items-center gap-1 md:flex">{links("btn-ghost !px-3")}</nav>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/employer" aria-current={path.startsWith("/employer") ? "page" : undefined} className={`btn-ghost !px-2.5 md:!px-3 ${path.startsWith("/employer") ? "!text-teal underline decoration-sage decoration-2 underline-offset-8" : ""}`}><span className="md:hidden">{tr("Employers", "أصحاب العمل")}</span><span className="hidden md:inline">{tr("For employers", "لأصحاب العمل")}</span></Link>
          <button type="button" className="btn-secondary shrink-0 !px-3.5" onClick={() => setLang(lang === "en" ? "ar" : "en")} lang={lang === "en" ? "ar" : "en"}>
            {lang === "en" ? "العربية" : "English"}
          </button>
        </div>
      </div>
      <nav aria-label={tr("Main", "القائمة الرئيسية")} className="mx-auto flex max-w-6xl justify-between gap-1 px-2 pb-2 md:hidden">{links("btn-ghost !px-2 text-sm")}</nav>
      {inJourney && <div className="mx-auto max-w-6xl px-4 pb-3"><JourneyIndicator /></div>}
    </header>
  );
}

export function Footer() {
  const { tr } = useBridge();
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p><span className="font-semibold text-teal">{tr("Your next step, clearer.", "خطوتك الجايّة أوضح.")}</span> {tr("A hackathon prototype (AI Quest 2026). Guidance only: Bridgecom does not decide admission, funding or hiring.", "نموذج أولي ضمن هاكاثون AI Quest 2026. إرشاد فقط: بريدجكوم لا يقرّر القبول أو التمويل أو التوظيف.")}</p>
        <nav aria-label={tr("Footer", "تذييل الصفحة")} className="flex shrink-0 flex-wrap gap-x-5 gap-y-2 whitespace-nowrap">
          <Link href="/how" className="underline decoration-line underline-offset-4 transition-colors duration-[180ms] hover:text-teal hover:decoration-sage">{tr("How it works", "كيف يعمل")}</Link>
          <Link href="/data" className="underline decoration-line underline-offset-4 transition-colors duration-[180ms] hover:text-teal hover:decoration-sage">{tr("About the data", "عن البيانات")}</Link>
          <Link href="/employer" className="underline decoration-line underline-offset-4 transition-colors duration-[180ms] hover:text-teal hover:decoration-sage">{tr("For employers", "لأصحاب العمل")}</Link>
          <Link href="/admin" className="underline decoration-line underline-offset-4 transition-colors duration-[180ms] hover:text-teal hover:decoration-sage">{tr("Admin", "الإدارة")}</Link>
        </nav>
      </div>
    </footer>
  );
}

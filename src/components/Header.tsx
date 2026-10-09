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
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ivory/90 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-2 btn-primary">{tr("Skip to content", "انتقل إلى المحتوى")}</a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="min-w-0 rounded-xl"><Wordmark descriptor={tr("Education and skills guidance for Jordan", "إرشاد تعليمي ومهاري في الأردن")} /></Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/dashboard" className="btn-ghost !px-3">{tr("My dashboard", "لوحتي")}</Link>
          <Link href="/employer" className="btn-ghost hidden md:inline-flex">{tr("For employers", "لأصحاب العمل")}</Link>
          <Link href="/data" className="btn-ghost hidden lg:inline-flex">{tr("About the data", "عن البيانات")}</Link>
          <button type="button" className="btn-secondary !px-3.5" onClick={() => setLang(lang === "en" ? "ar" : "en")} lang={lang === "en" ? "ar" : "en"}>
            {lang === "en" ? "العربية" : "English"}
          </button>
        </div>
      </div>
      {inJourney && <div className="mx-auto max-w-6xl px-4 pb-3"><JourneyIndicator /></div>}
    </header>
  );
}

export function Footer() {
  const { tr } = useBridge();
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>{tr("Bridgecom: your next step, made clearer. A hackathon prototype (AI Quest 2026). Guidance only, not admission or hiring decisions.", "بريدجكوم: خطوتك التالية، بوضوح أكبر. نموذج أولي ضمن هاكاثون AI Quest 2026. إرشاد فقط، وليس قرارات قبول أو توظيف.")}</p>
        <nav aria-label={tr("Footer", "تذييل الصفحة")} className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/data" className="underline underline-offset-2">{tr("About the data", "عن البيانات")}</Link>
          <Link href="/employer" className="underline underline-offset-2">{tr("For employers", "لأصحاب العمل")}</Link>
          <Link href="/admin" className="underline underline-offset-2">{tr("Admin", "الإدارة")}</Link>
        </nav>
      </div>
    </footer>
  );
}

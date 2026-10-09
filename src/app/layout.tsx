import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { ProfileProvider } from "@/components/ProfileProvider";
import { Footer, Header } from "@/components/Header";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });
const plexAr = IBM_Plex_Sans_Arabic({ variable: "--font-plex-ar", subsets: ["arabic"], weight: ["400", "500", "600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: "Bridgecom: your next step, made clearer",
  description: "Education and skills guidance for Jordan: university program options with published minimums and sourced costs, skills drawn from your own words, and a comparison of your experience with a role. Every suggestion shows its reasons.",
};
export const viewport: Viewport = { themeColor: "#264653", width: "device-width", initialScale: 1 };

// Returning Arabic readers: the saved language is only known after hydration, so the first paint would be English and
// then reflow into Arabic and swap to the Arabic font (a large layout shift). This keeps the page unpainted until the
// saved language is applied and its font has loaded, with a hard 1.5s cap. It does nothing for first-time visitors or when JavaScript is off.
const LANG_GUARD = `(function(){try{var p=JSON.parse(localStorage.getItem("bridgecom.profile.v1")||"null");if(!p||p.language!=="ar")return;var d=document.documentElement;d.setAttribute("data-bc-pending","");var mo,t,done=function(){d.removeAttribute("data-bc-pending");if(mo)mo.disconnect();clearTimeout(t);};mo=new MutationObserver(function(){if(d.lang==="ar"){mo.disconnect();requestAnimationFrame(function(){(document.fonts?document.fonts.ready:Promise.resolve()).then(done);});}});mo.observe(d,{attributes:true,attributeFilter:["lang"]});t=setTimeout(done,1500);}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" className={`${jakarta.variable} ${plexAr.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LANG_GUARD }} />
      </head>
      <body className="antialiased min-h-screen">
        <ProfileProvider>
          <Header />
          <main id="main" className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <Footer />
        </ProfileProvider>
      </body>
    </html>
  );
}

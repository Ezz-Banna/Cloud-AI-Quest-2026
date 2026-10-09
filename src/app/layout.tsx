import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { ProfileProvider } from "@/components/ProfileProvider";
import { Footer, Header } from "@/components/Header";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });
const plexAr = IBM_Plex_Sans_Arabic({ variable: "--font-plex-ar", subsets: ["arabic"], weight: ["400", "500", "600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: "Bridgecom: from school to university to work",
  description: "AI guidance that connects Jordanian students to the right university program, opportunities and jobs, with every recommendation explained.",
};
export const viewport: Viewport = { themeColor: "#264653", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr">
      <body className={`${jakarta.variable} ${plexAr.variable} antialiased min-h-screen`}>
        <ProfileProvider>
          <Header />
          <main id="main" className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <Footer />
        </ProfileProvider>
      </body>
    </html>
  );
}

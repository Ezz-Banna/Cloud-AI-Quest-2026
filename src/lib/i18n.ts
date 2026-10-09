// Minimal bilingual dictionary. Keys are English phrases' ids; Arabic is Modern Standard Arabic.
export type Lang = "en" | "ar";

const dict = {
  tagline: { en: "From where you are to where you could be.", ar: "من حيث أنت، إلى حيث يمكن أن تكون." },
  skip_intro: { en: "Skip intro", ar: "تخطَّ المقدمة" },
  discover: { en: "Discover", ar: "اكتشف" },
  empower: { en: "Empower", ar: "تمكَّن" },
  succeed: { en: "Succeed", ar: "انجح" },
  discover_sub: { en: "School to university", ar: "من المدرسة إلى الجامعة" },
  empower_sub: { en: "Student to opportunity", ar: "من الطالب إلى الفرصة" },
  succeed_sub: { en: "Learning to employment", ar: "من التعلم إلى العمل" },
  about_data: { en: "About the data", ar: "عن البيانات" },
  employers: { en: "For employers", ar: "لأصحاب العمل" },
  start: { en: "Start my journey", ar: "ابدأ رحلتي" },
  continue: { en: "Continue", ar: "متابعة" },
  back: { en: "Back", ar: "رجوع" },
  your_journey: { en: "Your journey", ar: "رحلتك" },
  completed: { en: "Completed", ar: "مكتمل" },
  current: { en: "You are here", ar: "أنت هنا" },
  upcoming: { en: "Up next", ar: "التالي" },
  verified: { en: "Verified", ar: "موثّق" },
  partial: { en: "Partly verified", ar: "موثّق جزئياً" },
  unverified: { en: "Unverified", ar: "غير موثّق" },
  synthetic: { en: "Synthetic demo data", ar: "بيانات تجريبية مصطنعة" },
  self_reported: { en: "Self-reported", ar: "إفادة ذاتية" },
  evidence_attached: { en: "Evidence attached", ar: "دليل مرفق" },
  practical_assessed: { en: "Practically assessed", ar: "مُقيَّم عملياً" },
  issuer_verified: { en: "Issuer verified", ar: "موثّق من الجهة المصدرة" },
  ai_mode: { en: "AI", ar: "ذكاء اصطناعي" },
  offline_mode: { en: "Offline rules (AI unavailable)", ar: "قواعد بدون اتصال (الذكاء الاصطناعي غير متاح)" },
  language: { en: "العربية", ar: "English" },
  menu: { en: "Menu", ar: "القائمة" },
} as const;

export type Key = keyof typeof dict;
export const t = (k: Key, lang: Lang) => dict[k][lang];

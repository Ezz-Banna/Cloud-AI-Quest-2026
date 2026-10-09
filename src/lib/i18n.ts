// Minimal bilingual dictionary. Keys are English phrases' ids; Arabic is Modern Standard Arabic.
export type Lang = "en" | "ar";

const dict = {
  tagline: { en: "Your next step, made clearer.", ar: "خطوتك التالية، بوضوح أكبر." },
  descriptor: { en: "Education and skills guidance for Jordan", ar: "إرشاد تعليمي ومهاري في الأردن" },
  find_next_step: { en: "Find my next step", ar: "اعرف خطوتك التالية" },
  explore_example: { en: "Explore an example", ar: "استكشف مثالاً" },
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

// ----- display helpers for data values (records stay in English; these only translate labels) -----
const CITY_AR: Record<string, string> = {
  Amman: "عمّان", Irbid: "إربد", Zarqa: "الزرقاء", Salt: "السلط", Madaba: "مادبا", Karak: "الكرك", Mafraq: "المفرق", Aqaba: "العقبة",
  Tafilah: "الطفيلة", "Ma'an": "معان", Jerash: "جرش", Ajloun: "عجلون", "Ar Ramtha": "الرمثا", "Mu'tah": "مؤتة", Mushaqar: "المشقر", Remote: "عن بُعد",
  "near": "قرب", "road": "طريق",
};
/** Translates known place words inside a city string, e.g. "Ar Ramtha (Irbid)" → "الرمثا (إربد)". */
export function cityLabel(city: string | null | undefined, lang: Lang) {
  if (!city) return "—";
  if (lang !== "ar") return city;
  return Object.keys(CITY_AR).sort((a, b) => b.length - a.length).reduce((s, k) => s.replaceAll(k, CITY_AR[k]), city);
}

const MISSING_AR: Record<string, string> = {
  "study plan": "الخطة الدراسية", tuition: "الرسوم", "other mandatory fees": "الرسوم الإلزامية الأخرى", "campus location": "موقع الحرم",
  "practical training details": "تفاصيل التدريب العملي", "admission minimum": "الحد الأدنى للقبول", "credit hours": "الساعات المعتمدة",
  "accreditation check": "التحقق من الاعتماد", "accessibility facilities": "مرافق إمكانية الوصول",
};
export function missingLabel(x: string, lang: Lang) {
  if (lang !== "ar") return x;
  if (x.startsWith("conflicting sources: ")) return `مصادر متعارضة: ${x.slice(21)}`;
  return MISSING_AR[x] ?? x;
}

const STREAM_AR: Record<string, string> = { scientific: "علمي", literary: "أدبي", it: "تكنولوجيا المعلومات", industrial: "صناعي", health: "صحي", other: "أخرى" };
export const streamLabel = (s: string, lang: Lang) => (lang === "ar" ? STREAM_AR[s] ?? s : s);

const KIND_AR: Record<string, string> = { scholarship: "منحة دراسية", grant: "منحة", loan: "قرض", sponsorship: "رعاية", program: "برنامج", job: "وظيفة", internship: "تدريب", project: "مشروع" };
export const kindLabel = (k: string, lang: Lang) => (lang === "ar" ? KIND_AR[k] ?? k : k);

const DATASET_AR: Record<string, string> = { universities: "الجامعات", programs: "البرامج", scholarships: "المنح والدعم", courses: "الدورات" };
export const datasetLabel = (k: string, lang: Lang) => (lang === "ar" ? DATASET_AR[k] ?? k : k);

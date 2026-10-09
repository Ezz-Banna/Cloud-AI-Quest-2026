// Offline fallbacks: transparent keyword rules used when the AI service is unavailable.
// They are deliberately conservative: they extract less, never more.
import { CITIES, FIELDS, SKILLS } from "../data/taxonomy";
import { extractRequirements } from "../engines/requirements";

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
export const normDigits = (s: string) => s.replace(/[٠-٩]/g, (c) => String(AR_DIGITS.indexOf(c)));
const squash = (s: string) => normDigits(s).toLowerCase().replace(/\s+/g, " ").replace(/[“”"']/g, "").trim();

export function quoteInText(quote: string, text: string) {
  const q = squash(quote);
  return q.length >= 2 && squash(text).includes(q);
}

const FIELD_WORDS: Record<string, string[]> = {
  "computer-science": ["computer", "programming", "coding", "software", "حاسوب", "برمجة", "كمبيوتر"],
  "software-engineering": ["software engineer", "apps", "web", "هندسة البرمجيات", "تطبيقات"],
  "ai-data-science": ["artificial intelligence", " ai ", "data science", "machine learning", "ذكاء اصطناعي", "الذكاء الاصطناعي", "بيانات"],
  medicine: ["medicine", "doctor", "physician", "طب", "طبيب", "دكتور"],
  nursing: ["nursing", "nurse", "تمريض", "ممرض"],
  pharmacy: ["pharmacy", "pharmacist", "صيدلة", "صيدلي"],
  "civil-engineering": ["civil", "construction", "bridges", "buildings", "هندسة مدنية", "إنشاءات", "بناء"],
  "business-administration": ["business", "management", "marketing", "entrepreneur", "startup", "إدارة", "أعمال", "تسويق", "ريادة"],
};

const CITY_AR: Record<string, string> = { "عمان": "Amman", "عمّان": "Amman", "إربد": "Irbid", "اربد": "Irbid", "الزرقاء": "Zarqa", "السلط": "Salt", "مادبا": "Madaba", "الكرك": "Karak", "المفرق": "Mafraq", "العقبة": "Aqaba", "الطفيلة": "Tafilah", "معان": "Ma'an", "جرش": "Jerash", "عجلون": "Ajloun" };

const SUBJECT_WORDS: Record<string, string[]> = {
  math: ["math", "رياضيات"], physics: ["physics", "فيزياء"], chemistry: ["chemistry", "كيمياء"], biology: ["biology", "أحياء", "احياء"],
  computing: ["computer", "programming", "coding", "حاسوب", "برمجة"], english: ["english", "إنجليزي", "انجليزي"],
  arabic: ["arabic language", "لغة عربية"], business: ["business", "economics", "اقتصاد"], arts: ["drawing", "art ", "design", "رسم", "تصميم"],
};

export function fallbackProfile(text: string) {
  const t = ` ${normDigits(text).toLowerCase()} `;
  const avgMatch = t.match(/(\d{2}(?:\.\d{1,2})?)\s*(?:%|٪|percent|average|معدل|in the|scientific|literary|stream|tawjihi|توجيهي|علمي|أدبي|ادبي|في)/) || t.match(/(?:average|avg|معدل|معدلي)[^\d]{0,15}(\d{2}(?:\.\d{1,2})?)/);
  const avg = avgMatch ? Number(avgMatch[1]) : null;
  const budgetMatch = t.match(/(\d{3,5})\s*(?:jod|jd|dinar|دينار)/);
  const interests = FIELDS.filter((f) => (FIELD_WORDS[f.id] ?? []).some((w) => t.includes(w))).map((f) => f.id);
  const cities = [
    ...CITIES.filter((c) => t.includes(c.toLowerCase())),
    ...Object.entries(CITY_AR).filter(([ar]) => t.includes(ar)).map(([, en]) => en),
  ];
  const stream = /scientific|علمي/.test(t) ? "scientific" : /literary|أدبي|ادبي/.test(t) ? "literary" : /\bit\b|information technology|تكنولوجيا المعلومات/.test(t) ? "it" : /industrial|صناعي/.test(t) ? "industrial" : /health|صحي/.test(t) ? "health" : null;
  return {
    tawjihi_avg: avg != null && avg >= 40 && avg <= 100 ? avg : null,
    stream: stream as "scientific" | "literary" | "it" | "industrial" | "health" | null,
    interests,
    dream_careers: [] as string[],
    career_tags: [...new Set(FIELDS.filter((f) => interests.includes(f.id)).flatMap((f) => f.careers.slice(0, 2)))],
    budget_jod_per_year: budgetMatch ? Number(budgetMatch[1]) : null,
    financial_need: /scholarship|support|can't afford|cannot afford|منحة|دعم|قرض/.test(t) ? true : null,
    preferred_cities: [...new Set(cities)],
    open_to_relocate: /anywhere|any city|أي مدينة|اي مدينة/.test(t) ? true : null,
    university_type: (/private|خاصة/.test(t) ? "private" : /public|government|حكومية|رسمية/.test(t) ? "public" : "any") as "public" | "private" | "any",
    accessibility_needs: /wheelchair|visual|hearing|disab|كرسي|إعاقة|بصري|سمعي/.test(t) ? ["Mentioned an accessibility need (please review)"] : [],
    strengths: [] as string[],
    subjects: Object.entries(SUBJECT_WORDS).filter(([, ws]) => ws.some((w) => t.includes(w))).map(([k]) => k),
    learning_style: (/hands[- ]on|practical|عملي|تطبيق/.test(t) ? "hands-on" : null) as "hands-on" | "theory" | "mixed" | null,
    clarifications: ["The AI service was unavailable, so only simple keywords were read. Please review every field."],
  };
}

function sentenceWith(text: string, kw: string) {
  const parts = text.split(/(?<=[.!?\n؟])\s*/);
  return parts.find((p) => p.toLowerCase().includes(kw)) ?? kw;
}

export function fallbackSkills(text: string) {
  const t = text.toLowerCase();
  const out: { skill_id: string; level: number; quote: string; rationale: string }[] = [];
  for (const s of SKILLS) {
    const kw = s.keywords.find((k) => new RegExp(`(^|[^a-z])${k.replace(/[.+]/g, "\\$&")}([^a-z]|$)`).test(t));
    if (kw) out.push({ skill_id: s.id, level: 1, quote: sentenceWith(text, kw).trim().slice(0, 200), rationale: `Mentions "${kw}" (keyword match, offline mode)` });
  }
  return out;
}

/** Offline job reading: the deterministic extractor. Every item still goes through the person's review step. */
export function fallbackJob(text: string) {
  const x = extractRequirements(text);
  return { title: x.title, items: x.items, ignored: x.ignored, suspicious: x.suspicious };
}

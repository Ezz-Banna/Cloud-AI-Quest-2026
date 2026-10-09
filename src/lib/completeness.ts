import type { LearnerProfile } from "./types";

export interface CompletenessItem { id: string; en: string; ar: string; done: boolean; href: string }

export function completeness(p: LearnerProfile, selectedRole?: string): { pct: number; items: CompletenessItem[] } {
  const items: CompletenessItem[] = [
    { id: "edu", en: "Education level", ar: "المستوى التعليمي", done: !!p.education_level, href: "/discover" },
    { id: "results", en: "Stream and average", ar: "الفرع والمعدل", done: !!p.stream && p.tawjihi_avg != null, href: "/discover" },
    { id: "interests", en: "Fields of interest", ar: "التخصصات المفضلة", done: p.interests.length > 0, href: "/discover" },
    { id: "careers", en: "Career dreams", ar: "المهن المرغوبة", done: p.dream_careers.length > 0, href: "/discover" },
    { id: "budget", en: "Budget", ar: "الميزانية", done: p.budget_jod_per_year != null, href: "/discover" },
    { id: "place", en: "Preferred locations", ar: "المدن المفضلة", done: p.preferred_cities.length > 0, href: "/discover" },
    { id: "priorities", en: "University priorities", ar: "أولويات اختيار الجامعة", done: (p.priorities ?? []).length > 0, href: "/discover" },
    { id: "saved", en: "Saved a program", ar: "حفظ برنامج", done: (p.saved_programs ?? []).length > 0, href: "/discover/results" },
    { id: "achievement", en: "Added an achievement", ar: "إضافة إنجاز", done: p.achievements.length > 0, href: "/empower" },
    { id: "skills", en: "Skills with evidence", ar: "مهارات بأدلة", done: p.skills.some((s) => s.status !== "self-reported"), href: "/empower" },
    { id: "role", en: "Compared with a role", ar: "المقارنة مع دور وظيفي", done: !!selectedRole, href: "/succeed" },
  ];
  return { pct: Math.round((items.filter((i) => i.done).length / items.length) * 100), items };
}

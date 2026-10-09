// Rule-based opportunity matching. A match means "worth checking", never "you will receive funding".
import type { AvailabilityStatus, LearnerProfile, Scholarship } from "../types";
import type { Reason } from "./programs";

export interface OpportunityMatch {
  item: Scholarship;
  score: number;
  status: "likely-relevant" | "check-eligibility" | "not-eligible";
  /** Application window, re-checked against today: a stored "open" with a past closing date becomes "closed". */
  window: AvailabilityStatus;
  reasons: Reason[];
}

const today = () => new Date().toISOString().slice(0, 10);

/** The stored status is trusted only while its dates agree with today's date. */
export function effectiveAvailability(s: Scholarship, now = today()): AvailabilityStatus {
  const a = s.availability;
  if (!a) return "unverified";
  if (a.closes && a.closes < now) return a.status === "historical" ? "historical" : "closed";
  if (a.status === "open" && a.opens && a.opens > now) return "announced";
  if (a.status === "announced" && a.opens && a.opens <= now && a.closes && a.closes >= now) return "open";
  if (a.status === "open" && !a.closes && !a.opens) return "unverified"; // "open" needs published dates
  return a.status;
}

const WINDOW_ORDER: Record<AvailabilityStatus, number> = { open: 0, announced: 1, unverified: 2, closed: 3, historical: 4 };

export function matchScholarships(p: LearnerProfile, items: Scholarship[], stage: "pre-university" | "university" | "graduate" = "pre-university", now = today()): OpportunityMatch[] {
  return items.map((s): OpportunityMatch => {
    const reasons: Reason[] = [];
    let blocked = false;
    let unknown = false;
    let score = 0;
    const c = s.criteria ?? {};
    // A school leaver can use both pre-university and first-year university support.
    const accepted = stage === "pre-university" ? ["pre-university", "university"] : [stage];
    if (c.stage && !accepted.includes(c.stage)) {
      reasons.push({ code: "stage-mismatch", weight: -50, en: `Aimed at ${c.stage} students`, ar: "موجّه لمرحلة دراسية مختلفة" });
      score -= 50;
      blocked = true;
    }
    if (c.min_avg != null) {
      if (p.tawjihi_avg == null) { unknown = true; }
      else if (p.tawjihi_avg >= c.min_avg) { score += 30; reasons.push({ code: "avg-ok", weight: 30, en: `Your average meets the stated minimum of ${c.min_avg}`, ar: `معدلك يحقق الحد الأدنى المعلن ${c.min_avg}` }); }
      else { blocked = true; reasons.push({ code: "avg-low", weight: -40, en: `Stated minimum average is ${c.min_avg}`, ar: `الحد الأدنى المعلن للمعدل ${c.min_avg}` }); }
    }
    if (c.need_based) {
      if (p.financial_need) { score += 30; reasons.push({ code: "need", weight: 30, en: "Supports students with financial need, which you indicated", ar: "يدعم الطلبة ذوي الحاجة المالية كما أشرت" }); }
      else if (p.financial_need == null) unknown = true;
      else { score -= 10; reasons.push({ code: "need-not-indicated", weight: -10, en: "Prioritises financial need", ar: "يعطي الأولوية للحاجة المالية" }); }
    }
    if (c.fields && c.fields.length > 0) {
      const hit = c.fields.find((f) => p.interests.includes(f));
      if (hit) { score += 25; reasons.push({ code: "field", weight: 25, en: "Covers a field you are interested in", ar: "يشمل تخصصاً يهمك" }); }
      else { score -= 15; reasons.push({ code: "field-other", weight: -15, en: `Limited to: ${c.fields.join(", ")}`, ar: `مقتصر على: ${c.fields.join("، ")}` }); }
    } else {
      score += 10; reasons.push({ code: "open-field", weight: 10, en: "Open to all fields", ar: "متاح لجميع التخصصات" });
    }
    const window = effectiveAvailability(s, now);
    const a = s.availability;
    if (window === "open") reasons.push({ code: "window-open", weight: 0, en: `Applications open until ${a?.closes}`, ar: `التقديم مفتوح حتى ${a?.closes}` });
    else if (window === "announced") reasons.push({ code: "window-announced", weight: 0, en: `Applications open on ${a?.opens}`, ar: `يفتح التقديم في ${a?.opens}` });
    else if (window === "closed") reasons.push({ code: "window-closed", weight: 0, en: a?.closes ? `Last application window closed on ${a.closes}; watch for the next cycle` : "Last application window has closed; watch for the next cycle", ar: a?.closes ? `أُغلق آخر باب للتقديم في ${a.closes}؛ تابع الدورة القادمة` : "أُغلق آخر باب للتقديم؛ تابع الدورة القادمة" });
    else if (window === "historical") reasons.push({ code: "window-historical", weight: 0, en: "Only older information found; it may no longer run", ar: "لم نجد سوى معلومات قديمة؛ قد لا يكون مستمراً" });
    else reasons.push({ code: "window-unverified", weight: 0, en: "Current application dates not verified", ar: "مواعيد التقديم الحالية غير موثّقة" });
    if (s.verification !== "verified") reasons.push({ code: "unverified", weight: 0, en: "Details not fully verified; confirm on the official page", ar: "التفاصيل غير موثّقة بالكامل؛ تحقق من الصفحة الرسمية" });
    // A closed or historical window is never presented as a current recommendation.
    const stale = window === "closed" || window === "historical";
    const status: OpportunityMatch["status"] = blocked ? "not-eligible" : unknown || stale || score < 30 ? "check-eligibility" : "likely-relevant";
    return { item: s, score, status, window, reasons };
  }).sort((a, b) => {
    const o = { "likely-relevant": 0, "check-eligibility": 1, "not-eligible": 2 } as const;
    return o[a.status] - o[b.status] || WINDOW_ORDER[a.window] - WINDOW_ORDER[b.window] || b.score - a.score;
  });
}

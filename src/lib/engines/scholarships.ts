// Rule-based opportunity matching. A match means "worth checking", never "you will receive funding".
import type { LearnerProfile, Scholarship } from "../types";
import type { Reason } from "./programs";

export interface OpportunityMatch {
  item: Scholarship;
  score: number;
  status: "likely-relevant" | "check-eligibility" | "not-eligible";
  reasons: Reason[];
}

export function matchScholarships(p: LearnerProfile, items: Scholarship[], stage: "pre-university" | "university" | "graduate" = "pre-university"): OpportunityMatch[] {
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
    if (s.verification !== "verified") reasons.push({ code: "unverified", weight: 0, en: "Details not fully verified; confirm on the official page", ar: "التفاصيل غير موثّقة بالكامل؛ تحقق من الصفحة الرسمية" });
    const status: OpportunityMatch["status"] = blocked ? "not-eligible" : unknown || score < 30 ? "check-eligibility" : "likely-relevant";
    return { item: s, score, status, reasons };
  }).sort((a, b) => {
    const o = { "likely-relevant": 0, "check-eligibility": 1, "not-eligible": 2 } as const;
    return o[a.status] - o[b.status] || b.score - a.score;
  });
}

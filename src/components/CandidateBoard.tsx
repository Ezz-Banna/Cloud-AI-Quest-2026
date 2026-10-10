"use client";
// What an employer sees for one role: people who chose to share with it, which of the role's skills they have
// recorded, the accomplishments they picked, and contact details only when they opted in. Shown in the order
// people shared; there is no score or ranking and nothing here is a hiring verdict.
import { useEffect, useState } from "react";
import { useBridge } from "./ProfileProvider";
import { SKILL_BY_ID } from "@/lib/data/taxonomy";

export interface CandCheck { skill_id: string; importance: string; state: string; level_ok: boolean | null; level_needed?: number; level_recorded?: number }
export interface CandAchievement { title: string; kind: string; description: string; links: string[]; skills: string[]; date?: string | null }
export interface Cand {
  id: string; display_name: string; shared_at: string; status: string; synthetic?: boolean;
  counts: { required: number; required_recorded: number; required_with_evidence: number; required_reviewed: number; preferred: number; preferred_recorded: number };
  checks: CandCheck[];
  achievements?: CandAchievement[];
  contact?: { email?: string | null; phone?: string | null; preferred?: "email" | "phone" | "whatsapp" | null } | null;
}

const LEVEL = { en: ["None", "Basic", "Working", "Strong"], ar: ["لا شيء", "أساسي", "عملي", "متقدم"] };

export function CandidateBoard({ roleId, roleTitle, synthetic = false }: { roleId: string; roleTitle?: string; synthetic?: boolean }) {
  const { tr, lang, progress } = useBridge();
  const [cands, setCands] = useState<Cand[] | null>(null);
  const [err, setErr] = useState<"denied" | "network" | null>(null);
  const [onlyMatching, setOnlyMatching] = useState(false);
  const name = (id: string) => (lang === "ar" ? SKILL_BY_ID[id]?.name_ar : SKILL_BY_ID[id]?.name_en) ?? id;

  const token = progress.role_tokens?.[roleId];
  useEffect(() => {
    if (!roleId) return;
    let live = true;
    setCands(null); setErr(null);
    // Demo (synthetic) roles show their synthetic people to anyone; other roles need this device's manage token.
    if (!token && !synthetic) { setErr("denied"); setCands([]); return; }
    fetch(`/api/candidates?role_id=${encodeURIComponent(roleId)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async (r) => { const d = await r.json(); if (!live) return; if (r.status === 403) { setErr("denied"); setCands([]); return; } if (!r.ok) throw new Error(d.error); setCands(d.candidates ?? []); })
      .catch(() => { if (live) { setErr("network"); setCands([]); } });
    return () => { live = false; };
  }, [roleId, token, synthetic]);

  const has = (c: CandCheck) => c.state !== "none-recorded";
  const matching = (c: Cand) => c.checks.some((k) => k.importance === "required" && has(k));
  const shown = (cands ?? []).filter((c) => !onlyMatching || matching(c));

  if (!cands) return <div className="mt-4 h-24 animate-pulse rounded-2xl bg-mist/60" aria-busy="true" />;
  if (err) return <p className="mt-4 rounded-2xl bg-sand-100 p-4 text-sm text-sand-700">{err === "denied" ? tr("Shared profiles for this role are visible only on the device that published it, or to a signed-in admin.", "الملفات المشاركة لهذا الدور تظهر فقط على الجهاز الذي نشره، أو لمسؤول مسجّل الدخول.") : tr("We couldn't reach the Bridgecom server. Check your connection and refresh.", "تعذّر الوصول إلى خادم بريدجكوم. تحقق من الاتصال وحدّث الصفحة.")}</p>;
  if (cands.length === 0) return <p className="empty-state mt-4 text-sm">{tr("No candidates have shared their profile yet. People choose to share, per role, after comparing.", "لم يشارك أحد ملفه بعد. يختار الأشخاص المشاركة لكل دور على حدة بعد المقارنة.")}</p>;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted">{tr(`${cands.length} shared · ${cands.filter(matching).length} with at least one required skill`, `${cands.length} شاركوا · ${cands.filter(matching).length} لديهم مهارة أساسية واحدة على الأقل`)}</p>
        <label className="inline-flex items-center gap-2"><input type="checkbox" className="accent-teal" checked={onlyMatching} onChange={(e) => setOnlyMatching(e.target.checked)} />{tr("Only people with a required skill", "فقط من لديه مهارة أساسية")}</label>
      </div>
      <ul className="mt-3 space-y-4">
        {shown.map((c) => {
          const req = c.checks.filter((k) => k.importance === "required");
          const pref = c.checks.filter((k) => k.importance === "preferred");
          const chip = (k: CandCheck) => {
            const ok = has(k) && k.level_ok !== false;
            const low = has(k) && k.level_ok === false;
            const cls = ok ? "border-ok/30 bg-ok-100 text-ok" : low ? "border-warn/30 bg-warn-100 text-warn" : "border-line bg-mist text-muted";
            const mark = ok ? "✓" : low ? "◐" : "✗";
            const lv = has(k) && k.level_recorded != null ? ` · ${(lang === "ar" ? LEVEL.ar : LEVEL.en)[k.level_recorded] ?? ""}` : "";
            const title = has(k) ? tr(`Recorded: ${(LEVEL.en)[k.level_recorded ?? 0]} (needs ${LEVEL.en[k.level_needed ?? 0]}), ${k.state.replace(/-/g, " ")}`, `مسجّل: ${LEVEL.ar[k.level_recorded ?? 0]} (المطلوب ${LEVEL.ar[k.level_needed ?? 0]})`) : tr("Not recorded", "غير مسجّل");
            return <li key={k.skill_id} title={title} className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}><span aria-hidden="true">{mark} </span>{name(k.skill_id)}{lv}<span className="sr-only"> ({title})</span></li>;
          };
          const ct = c.contact;
          const digits = ct?.phone?.replace(/[^0-9]/g, "") ?? "";
          const subject = encodeURIComponent(tr(`About ${roleTitle ?? "your application"} (via Bridgecom)`, `بخصوص ${roleTitle ?? "طلبك"} (عبر بريدجكوم)`));
          return (
            <li key={c.id} className="rounded-2xl border border-line p-4 sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-lg font-bold text-teal">{c.display_name}{c.synthetic && <span className="ms-2 rounded-full bg-sand-100 px-2 py-0.5 align-middle text-xs font-semibold text-sand-700">◇ {tr("Synthetic demo person", "شخص تجريبي")}</span>}</p>
                <p className="text-xs text-muted">{tr("Shared", "شارك")} {new Date(c.shared_at).toLocaleDateString(lang === "ar" ? "ar" : undefined)}</p>
              </div>
              <p className="mt-1 text-sm"><strong>{tr(`Has ${req.filter(has).length} of ${req.length} required skills`, `لديه ${req.filter(has).length} من ${req.length} مهارات أساسية`)}</strong><span className="text-muted">{tr(` · ${req.filter((k) => has(k) && k.level_ok !== false).length} at the level you asked for`, ` · ${req.filter((k) => has(k) && k.level_ok !== false).length} بالمستوى المطلوب`)}</span><strong></strong><span className="text-muted">{tr(` · ${c.counts.required_with_evidence} with work attached · ${c.counts.required_reviewed} reviewed`, ` · ${c.counts.required_with_evidence} مع عمل مرفق · ${c.counts.required_reviewed} روجعت`)}</span></p>

              <div className="mt-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">{tr("Skills you need", "المهارات المطلوبة")}</h3>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">{req.map(chip)}</ul>
                {pref.length > 0 && <><h3 className="mt-2 text-xs font-bold uppercase tracking-wider text-muted">{tr("Nice to have", "مفضّلة")}</h3><ul className="mt-1.5 flex flex-wrap gap-1.5">{pref.map(chip)}</ul></>}
              </div>

              <div className="mt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">{tr("Accomplishments", "الإنجازات")}</h3>
                {(c.achievements ?? []).length === 0 ? <p className="mt-1 text-sm text-muted">{tr("None shared.", "لم يشارك إنجازات.")}</p> : (
                  <ul className="mt-1.5 space-y-2">
                    {c.achievements!.map((a, i) => (
                      <li key={i} className="rounded-xl bg-ivory p-3">
                        <p className="font-semibold text-ink">{a.title}{a.date && <span className="ms-2 text-xs font-normal text-muted">{a.date}</span>}</p>
                        {a.description && <p className="mt-0.5 text-sm text-ink/90">{a.description}</p>}
                        {(a.skills.length > 0 || a.links.length > 0) && (
                          <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                            {a.skills.map((s) => <span key={s} className="rounded-full bg-sage-100 px-2 py-0.5 text-teal">{name(s)}</span>)}
                            {a.links.map((l) => <a key={l} href={l} target="_blank" rel="noreferrer noopener" className="underline decoration-line underline-offset-2 hover:text-teal">{(() => { try { return new URL(l).hostname.replace(/^www\./, ""); } catch { return l; } })()} ↗</a>)}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-1 text-[0.7rem] text-muted">{tr("Described by the person. Links are theirs and have not been checked by Bridgecom.", "وصفها الشخص بنفسه. الروابط له ولم تتحقق منها بريدجكوم.")}</p>
              </div>

              <div className="mt-4 border-t border-line pt-3">
                {ct && (ct.email || ct.phone) ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">{tr("Contact", "التواصل")}</span>
                    {ct.email && <a className={ct.preferred === "email" ? "btn-primary !py-1.5" : "btn-secondary !py-1.5"} href={`mailto:${ct.email}?subject=${subject}`}>✉ {tr("Email", "بريد")} <span className="sr-only">{ct.email}</span></a>}
                    {ct.phone && <a className={ct.preferred === "whatsapp" ? "btn-primary !py-1.5" : "btn-secondary !py-1.5"} href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer noopener">WhatsApp</a>}
                    {ct.phone && <a className={ct.preferred === "phone" ? "btn-primary !py-1.5" : "btn-secondary !py-1.5"} href={`tel:${ct.phone.replace(/\s+/g, "")}`}>☎ {tr("Call", "اتصال")}</a>}
                    <span className="text-xs text-muted" dir="ltr">{[ct.email, ct.phone].filter(Boolean).join(" · ")}</span>
                  </div>
                ) : <p className="text-sm text-muted">{tr("Hasn't shared contact details with this role.", "لم يشارك بيانات التواصل مع هذا الدور.")}</p>}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted">{tr("✓ recorded at the level you asked for · ◐ recorded below it · ✗ not recorded. ", "✓ مسجّلة بالمستوى المطلوب · ◐ مسجّلة بمستوى أقل · ✗ غير مسجّلة. ")}{tr("In the order people shared, not ranked. Not a hiring recommendation. Contact details appear only when the person chose to share them with this role.", "بترتيب المشاركة دون تصنيف. ليست توصية توظيف. تظهر بيانات التواصل فقط إذا اختار الشخص مشاركتها مع هذا الدور.")}</p>
    </div>
  );
}

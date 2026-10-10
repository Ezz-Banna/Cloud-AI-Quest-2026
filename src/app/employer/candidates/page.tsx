"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useBridge } from "@/components/ProfileProvider";
import { VerificationBadge } from "@/components/Badges";
import { CandidateBoard } from "@/components/CandidateBoard";
import type { EmployerRole } from "@/lib/types";

function Board() {
  const { tr, progress, hydrated } = useBridge();
  const q = useSearchParams().get("role");
  const [roles, setRoles] = useState<EmployerRole[] | null>(null);
  const [roleId, setRoleId] = useState("");
  useEffect(() => {
    if (!hydrated) return; // wait for this device's role tokens before choosing a role
    fetch("/api/roles").then((r) => r.json()).then((d) => {
      const rs: EmployerRole[] = d.roles ?? [];
      setRoles(rs);
      // Start with the role asked for, else one this device published, else the first.
      const mine = rs.find((r) => progress.role_tokens?.[r.id]);
      setRoleId((x) => x || (q && rs.some((r) => r.id === q) ? q : mine?.id ?? rs[0]?.id ?? ""));
    }).catch(() => setRoles([]));
  }, [q, progress.role_tokens, hydrated]);
  const role = roles?.find((r) => r.id === roleId);
  return (
    <div>
      <p className="eyebrow">{tr("For employers", "لأصحاب العمل")}</p>
      <h1 className="h1 mt-2">{tr("People who shared with your role", "من شاركوا مع دورك")}</h1>
      <p className="mt-2 max-w-2xl text-muted">{tr("See which of your required skills each person has recorded, the work they chose to show, and contact them directly when they allowed it.", "شاهد أي من مهاراتك المطلوبة سجّلها كل شخص، والأعمال التي اختار عرضها، وتواصل معه مباشرة إن سمح بذلك.")}</p>
      <section className="card mt-6 p-5 sm:p-6" aria-labelledby="cb-h">
        <h2 id="cb-h" className="sr-only">{tr("Candidates", "المرشحون")}</h2>
        <label className="label" htmlFor="cb-role">{tr("Role", "الدور")}</label>
        <div className="flex flex-wrap items-center gap-3">
          <select id="cb-role" className="input !w-auto min-w-64" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            {(roles ?? []).map((r) => <option key={r.id} value={r.id}>{r.title}{r.verification === "synthetic" ? ` (${tr("synthetic", "مصطنع")})` : r.verification === "unverified" ? ` (${tr("demo, unverified", "تجريبي، غير موثّق")})` : ""}</option>)}
          </select>
          {role && <VerificationBadge v={role.verification} />}
          <Link href="/employer" className="btn-ghost">{tr("Publish another role", "انشر دوراً آخر")}</Link>
        </div>
        {roleId ? <CandidateBoard roleId={roleId} roleTitle={role?.title} /> : roles && <p className="empty-state mt-4 text-sm">{tr("No roles yet. Publish one first.", "لا توجد أدوار بعد. انشر دوراً أولاً.")}</p>}
      </section>
    </div>
  );
}

export default function CandidatesPage() {
  return <Suspense fallback={<div className="card mt-6 h-48 animate-pulse bg-mist/60" />}><Board /></Suspense>;
}

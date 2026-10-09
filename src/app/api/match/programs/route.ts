import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { parseBody, ProfileInput } from "@/lib/api";
import { getPrograms, getUniversities } from "@/lib/data/repo";
import { CRITERIA, CRITERION_LABEL, fitWeights, followUps, rankPrograms } from "@/lib/engines/programs";
import type { LearnerProfile } from "@/lib/types";

export async function POST(req: Request) {
  const b = await parseBody(req, z.object({ profile: ProfileInput }));
  if (!b.ok) return b.res;
  const profile = b.data.profile as unknown as LearnerProfile;
  const matches = rankPrograms(profile, getPrograms(), getUniversities());
  const weights = fitWeights(profile);
  return NextResponse.json({
    matches,
    follow_ups: followUps(profile, matches),
    weights,
    criteria: CRITERIA.map((c) => ({ id: c, ...CRITERION_LABEL[c], weight: weights[c] })),
  });
}

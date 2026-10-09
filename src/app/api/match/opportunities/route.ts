import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { parseBody, ProfileInput } from "@/lib/api";
import { getScholarships } from "@/lib/data/repo";
import { matchScholarships } from "@/lib/engines/scholarships";
import type { LearnerProfile } from "@/lib/types";

export async function POST(req: Request) {
  const b = await parseBody(req, z.object({ profile: ProfileInput, stage: z.enum(["pre-university", "university", "graduate"]).default("pre-university") }));
  if (!b.ok) return b.res;
  return NextResponse.json({ matches: matchScholarships(b.data.profile as unknown as LearnerProfile, getScholarships(), b.data.stage) });
}

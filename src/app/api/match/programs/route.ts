import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { parseBody, ProfileInput } from "@/lib/api";
import { getPrograms, getUniversities } from "@/lib/data/repo";
import { rankPrograms } from "@/lib/engines/programs";
import type { LearnerProfile } from "@/lib/types";

export async function POST(req: Request) {
  const b = await parseBody(req, z.object({ profile: ProfileInput }));
  if (!b.ok) return b.res;
  const matches = rankPrograms(b.data.profile as unknown as LearnerProfile, getPrograms(), getUniversities());
  return NextResponse.json({ matches });
}

import { NextResponse } from "next/server";
import { aiStatus } from "@/lib/ai/client";
import { coverage } from "@/lib/data/repo";

export const dynamic = "force-dynamic";
export function GET() {
  const ai = aiStatus();
  return NextResponse.json({ ai: ai.available, model: ai.model, ai_reason: ai.reason, coverage: coverage() });
}

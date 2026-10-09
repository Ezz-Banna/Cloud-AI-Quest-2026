import { NextResponse } from "next/server";
import { aiAvailable, MODEL } from "@/lib/ai/client";
import { coverage } from "@/lib/data/repo";

export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json({ ai: aiAvailable(), model: aiAvailable() ? MODEL : null, coverage: coverage() });
}

import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { aiStatus } from "@/lib/ai/client";

export const dynamic = "force-dynamic";
const started = Date.now();

// Liveness and readiness for the host and for smoke tests. No secrets, no personal data.
export function GET() {
  let storage: "ok" | "read-only" = "ok";
  try {
    const dir = path.join(process.cwd(), "data/runtime");
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
  } catch { storage = "read-only"; }
  const ai = aiStatus();
  return NextResponse.json({
    ok: storage === "ok",
    build: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? process.env.BUILD_ID ?? "local",
    uptime_s: Math.round((Date.now() - started) / 1000),
    storage,
    analysis_mode: ai.available ? "ai-with-rule-checks" : "keyword-rules",
  }, { status: storage === "ok" ? 200 : 503 });
}

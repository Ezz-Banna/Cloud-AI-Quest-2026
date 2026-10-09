// AI audit log for the admin review page. Stores metadata only, never the student's raw text.
import "server-only";
import fs from "node:fs";
import path from "node:path";

export interface AILogEntry {
  at: string;
  module: "profile" | "skills" | "job" | "explain";
  mode: "ai" | "offline";
  model?: string;
  latency_ms?: number;
  error?: string;
  returned: number;
  dropped_by_validation: number;
  notes?: string;
}

const FILE = path.join(process.cwd(), "data/runtime/ai-log.json");

export function logAI(e: Omit<AILogEntry, "at">) {
  try {
    const cur: AILogEntry[] = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : [];
    cur.push({ at: new Date().toISOString(), ...e });
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(cur.slice(-500), null, 2));
  } catch { /* logging must never break a request */ }
}

export function readAILog(): AILogEntry[] {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return []; }
}

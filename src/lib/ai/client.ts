// Server-only Claude adapter. One place for model choice, timeout, retry and structured output.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type * as z from "zod/v4";

export const MODEL = process.env.BRIDGECOM_MODEL || "claude-opus-5-5";
const TIMEOUT_MS = 20_000;

export type AIResult<T> =
  | { ok: true; data: T; mode: "ai"; model: string; latency_ms: number }
  | { ok: false; error: string };

let client: Anthropic | null | undefined;
function getClient(): Anthropic | null {
  if (client !== undefined) return client;
  // The SDK retries are disabled so the total stays at two attempts (ours) and under ~40s on stage.
  client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ maxRetries: 0, timeout: TIMEOUT_MS }) : null;
  return client;
}

export function aiAvailable() {
  return getClient() !== null && process.env.BRIDGECOM_OFFLINE !== "1";
}

export async function structured<S extends z.ZodType>(schema: S, system: string, user: string, maxTokens = 4000): Promise<AIResult<z.infer<S>>> {
  const c = getClient();
  if (!c || process.env.BRIDGECOM_OFFLINE === "1") return { ok: false, error: "AI not configured" };
  let lastErr = "unknown";
  for (let attempt = 0; attempt < 2; attempt++) {
    const t0 = Date.now();
    try {
      const res = await c.beta.messages.parse({
        model: MODEL,
        // Server-side fallback: if a safety classifier declines, the API reruns on a fallback model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        max_tokens: maxTokens,
        output_config: { effort: "low", format: betaZodOutputFormat(schema) },
        system,
        messages: [{ role: "user", content: user }],
      });
      if (res.stop_reason === "refusal") return { ok: false, error: "The AI declined this request" };
      if (res.parsed_output == null) { lastErr = "AI returned an invalid structure"; continue; }
      return { ok: true, data: res.parsed_output as z.infer<S>, mode: "ai", model: MODEL, latency_ms: Date.now() - t0 };
    } catch (e) {
      // Short categories only: raw API error bodies are not sent to the browser.
      if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return { ok: false, error: "AI key rejected" };
      if (e instanceof Anthropic.BadRequestError) return { ok: false, error: "AI request rejected" };
      lastErr = e instanceof Anthropic.APIConnectionTimeoutError ? "AI timed out"
        : e instanceof Anthropic.APIConnectionError ? "AI service unreachable"
        : e instanceof Anthropic.RateLimitError ? "AI rate limited"
        : e instanceof Anthropic.APIError ? `AI service error ${e.status ?? ""}`.trim()
        : "AI call failed";
    }
  }
  return { ok: false, error: lastErr };
}

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as z from "zod/v4";

vi.mock("server-only", () => ({}));
const parse = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error { status?: number }
  class Anthropic {
    static APIError = APIError;
    static AuthenticationError = class extends APIError {};
    static PermissionDeniedError = class extends APIError {};
    static BadRequestError = class extends APIError {};
    static APIConnectionError = class extends APIError {};
    static APIConnectionTimeoutError = class extends APIError {};
    static RateLimitError = class extends APIError {};
    beta = { messages: { parse: (...a: unknown[]) => parse(...a) } };
  }
  return { default: Anthropic };
});
vi.mock("@anthropic-ai/sdk/helpers/beta/zod", () => ({ betaZodOutputFormat: () => ({}) }));

const Schema = z.object({ x: z.number() });

async function load() {
  vi.resetModules();
  delete (globalThis as Record<symbol, unknown>)[Symbol.for("bridgecom.aiGuard")];
  return (await import("@/lib/ai/client")).structured;
}

beforeEach(() => {
  parse.mockReset();
  process.env.ANTHROPIC_API_KEY = "test-key";
  delete process.env.BRIDGECOM_OFFLINE;
  delete process.env.AI_DAILY_CALL_LIMIT;
});

describe("AI spending guard", () => {
  it("stops after the daily call limit with the normal error shape", async () => {
    process.env.AI_DAILY_CALL_LIMIT = "2";
    parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: { x: 1 } });
    const structured = await load();
    expect((await structured(Schema, "s", "u")).ok).toBe(true);
    expect((await structured(Schema, "s", "u")).ok).toBe(true);
    const r = await structured(Schema, "s", "u");
    expect(r).toEqual({ ok: false, error: "AI daily limit reached" });
    expect(parse).toHaveBeenCalledTimes(2);
  });
  it("counts a retry as a call and does not retry past the limit", async () => {
    process.env.AI_DAILY_CALL_LIMIT = "1";
    parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: null });
    const structured = await load();
    const r = await structured(Schema, "s", "u");
    expect(r).toEqual({ ok: false, error: "AI returned an invalid structure" });
    expect(parse).toHaveBeenCalledTimes(1);
  });
  it("allows at most 3 calls at once", async () => {
    const releases: (() => void)[] = [];
    parse.mockImplementation(() => new Promise((res) => releases.push(() => res({ stop_reason: "end_turn", parsed_output: { x: 1 } }))));
    const structured = await load();
    const running = [structured(Schema, "s", "u"), structured(Schema, "s", "u"), structured(Schema, "s", "u")];
    const fourth = await structured(Schema, "s", "u");
    expect(fourth).toEqual({ ok: false, error: "AI busy, try again shortly" });
    releases.forEach((r) => r());
    expect((await Promise.all(running)).every((r) => r.ok)).toBe(true);
    // A slot is free again once the earlier calls finish.
    parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: { x: 1 } });
    expect((await structured(Schema, "s", "u")).ok).toBe(true);
  });
  it("defaults to 2000 calls a day", async () => {
    parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: { x: 1 } });
    const structured = await load();
    (globalThis as Record<symbol, { day: string; calls: number; inFlight: number }>)[Symbol.for("bridgecom.aiGuard")] = { day: new Date().toISOString().slice(0, 10), calls: 1999, inFlight: 0 };
    expect((await structured(Schema, "s", "u")).ok).toBe(true);
    expect((await structured(Schema, "s", "u")).ok).toBe(false);
  });
});

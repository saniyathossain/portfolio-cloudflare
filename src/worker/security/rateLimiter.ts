import type { RateRule } from "../../types/SecurityConfig";

export interface RateDecision {
  readonly allowed: boolean;
  readonly retryAfterSeconds: number;
}

/** Cloudflare's Workers Rate Limiting binding (optional; `[[ratelimits]]` in wrangler.toml). */
interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface CounterStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
}

export interface RateLimiterEnvironment {
  readonly RATE_LIMITER?: unknown;
  readonly CONTACT_KV?: CounterStore | undefined;
}

export interface RateLimiter {
  /** Counts one hit for `key` in `scope` and says whether it is still within `rule`. Fails open on infrastructure errors. */
  consume(scope: string, key: string, rule: RateRule): Promise<RateDecision>;
  /** Reads the count without incrementing — used to refuse a locked-out client before doing any work. */
  peek(scope: string, key: string, rule: RateRule): Promise<RateDecision>;
}

const KV_MINIMUM_TTL_SECONDS = 60;
const FAIL_OPEN: RateDecision = { allowed: true, retryAfterSeconds: 0 };

interface Window {
  readonly index: number;
  readonly retryAfterSeconds: number;
}

function currentWindow(rule: RateRule, nowSeconds: number): Window {
  const index = Math.floor(nowSeconds / rule.windowSeconds);
  return { index, retryAfterSeconds: (index + 1) * rule.windowSeconds - nowSeconds };
}

function isBinding(value: unknown): value is RateLimitBinding {
  return typeof value === "object" && value !== null && typeof (value as RateLimitBinding).limit === "function";
}

/**
 * Fixed-window counters. Order of preference: the Workers Rate Limiting binding (atomic, no KV writes), then a
 * per-isolate memory map (free, best-effort), upgraded to KV when `durable` so a limit survives isolate recycling.
 * KV is eventually consistent, so the KV count is a deterrent for spam bursts — real volumetric DDoS is absorbed
 * by Cloudflare's network and WAF rate-limiting rules (docs/aidlc/57).
 */
export function createRateLimiter(
  environment: RateLimiterEnvironment,
  memory: Map<string, number>,
  clock: () => number = () => Date.now(),
): RateLimiter {
  const counterKey = (scope: string, key: string, windowIndex: number) => `rl:${scope}:${key}:${windowIndex}`;

  async function readCount(storageKey: string): Promise<number> {
    const kv = environment.CONTACT_KV;
    if (!kv) return memory.get(storageKey) ?? 0;
    return Number((await kv.get(storageKey)) ?? 0);
  }

  async function writeCount(storageKey: string, count: number, rule: RateRule): Promise<void> {
    const kv = environment.CONTACT_KV;
    if (!kv) {
      memory.set(storageKey, count);
      pruneMemory(memory);
      return;
    }
    await kv.put(storageKey, String(count), { expirationTtl: Math.max(rule.windowSeconds, KV_MINIMUM_TTL_SECONDS) });
  }

  return {
    async consume(scope, key, rule) {
      if (!key) return FAIL_OPEN;
      const binding = environment.RATE_LIMITER;
      try {
        if (isBinding(binding)) {
          const { success } = await binding.limit({ key: `${scope}:${key}` });
          return { allowed: success, retryAfterSeconds: success ? 0 : rule.windowSeconds };
        }
        const window = currentWindow(rule, clock() / 1000);
        const storageKey = counterKey(scope, key, window.index);
        const count = (await readCount(storageKey)) + 1;
        await writeCount(storageKey, count, rule);
        return { allowed: count <= rule.limit, retryAfterSeconds: count <= rule.limit ? 0 : window.retryAfterSeconds };
      } catch {
        return FAIL_OPEN;
      }
    },
    async peek(scope, key, rule) {
      if (!key) return FAIL_OPEN;
      try {
        const window = currentWindow(rule, clock() / 1000);
        const count = await readCount(counterKey(scope, key, window.index));
        return { allowed: count < rule.limit, retryAfterSeconds: count < rule.limit ? 0 : window.retryAfterSeconds };
      } catch {
        return FAIL_OPEN;
      }
    },
  };
}

const MEMORY_LIMIT = 5000;

/** Keeps the isolate-local map bounded so an attacker rotating IPs cannot grow it without limit. */
function pruneMemory(memory: Map<string, number>): void {
  if (memory.size <= MEMORY_LIMIT) return;
  const oldest = memory.keys().next();
  if (!oldest.done) memory.delete(oldest.value);
}

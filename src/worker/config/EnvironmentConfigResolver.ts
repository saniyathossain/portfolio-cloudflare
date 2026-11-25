import { EnvVar } from "../../enums/EnvVar";
import type { SecurityConfig } from "../../types/SecurityConfig";
import type { WorkerEnvironment } from "../types/WorkerEnvironment";

/** One overridable number: the Worker variable, where it lands in the config, and the range it must stay within. */
interface NumericOverride {
  readonly variable: EnvVar;
  readonly path: readonly [string, ...string[]];
  readonly min: number;
  readonly max: number;
}

const ONE_DAY_SECONDS = 86_400;
const ONE_YEAR_SECONDS = 31_536_000;
const ONE_MEBIBYTE = 1_048_576;

/** The single table of env → config mappings. Adding a tunable means adding a row here (and to EnvVar / the docs). */
const NUMERIC_OVERRIDES: readonly NumericOverride[] = [
  { variable: EnvVar.MaxUrlLength, path: ["limits", "maxUrlLength"], min: 64, max: 8192 },
  { variable: EnvVar.MaxContactBodyBytes, path: ["limits", "maxContactBodyBytes"], min: 256, max: ONE_MEBIBYTE },
  { variable: EnvVar.MaxCspReportBytes, path: ["limits", "maxCspReportBytes"], min: 256, max: 65_536 },
  { variable: EnvVar.MaxNameLength, path: ["limits", "maxNameLength"], min: 1, max: 500 },
  { variable: EnvVar.MaxEmailLength, path: ["limits", "maxEmailLength"], min: 3, max: 320 },
  { variable: EnvVar.MaxProjectLength, path: ["limits", "maxProjectLength"], min: 1, max: 20_000 },
  { variable: EnvVar.RateLimitContactLimit, path: ["rateLimits", "contact", "limit"], min: 1, max: 1000 },
  { variable: EnvVar.RateLimitContactWindowSeconds, path: ["rateLimits", "contact", "windowSeconds"], min: 1, max: ONE_DAY_SECONDS },
  { variable: EnvVar.RateLimitAdminFailureLimit, path: ["rateLimits", "adminAuthFailure", "limit"], min: 1, max: 1000 },
  { variable: EnvVar.RateLimitAdminFailureWindowSeconds, path: ["rateLimits", "adminAuthFailure", "windowSeconds"], min: 1, max: ONE_DAY_SECONDS },
  { variable: EnvVar.RateLimitCspReportLimit, path: ["rateLimits", "cspReport", "limit"], min: 1, max: 10_000 },
  { variable: EnvVar.RateLimitCspReportWindowSeconds, path: ["rateLimits", "cspReport", "windowSeconds"], min: 1, max: ONE_DAY_SECONDS },
  { variable: EnvVar.ContactRetentionSeconds, path: ["contactRetentionSeconds"], min: 60, max: ONE_YEAR_SECONDS * 5 },
  { variable: EnvVar.MaintenanceRetryAfterSeconds, path: ["maintenanceRetryAfterSeconds"], min: 1, max: ONE_DAY_SECONDS },
  { variable: EnvVar.AdminListDefaultLimit, path: ["adminList", "defaultLimit"], min: 1, max: 1000 },
  { variable: EnvVar.AdminListMaxLimit, path: ["adminList", "maxLimit"], min: 1, max: 1000 },
];

export interface ResolvedSecurityConfig {
  readonly config: SecurityConfig;
  /** Variables that were set but ignored (not an integer, or out of range). Logged once per isolate. */
  readonly issues: readonly string[];
}

type MutableRecord = Record<string, unknown>;

function parseInteger(raw: string): number | undefined {
  return /^\d+$/.test(raw.trim()) ? Number.parseInt(raw, 10) : undefined;
}

function assign(target: MutableRecord, path: readonly [string, ...string[]], value: number): void {
  const lastKey = path[path.length - 1] ?? path[0];
  let cursor = target;
  for (const key of path.slice(0, -1)) cursor = cursor[key] as MutableRecord;
  cursor[lastKey] = value;
}

/**
 * Layers Worker variables over the JSON security policy: JSON stays the documented default, a variable wins when it
 * is a whole number inside the allowed range, and anything else is ignored with an issue instead of breaking the
 * site. Results are memoised per environment object, so the work happens once per isolate.
 */
export class EnvironmentConfigResolver {
  private readonly cache = new WeakMap<object, ResolvedSecurityConfig>();

  constructor(private readonly base: SecurityConfig) {}

  resolve(environment: WorkerEnvironment): ResolvedSecurityConfig {
    const cached = this.cache.get(environment);
    if (cached) return cached;
    const resolved = this.compute(environment);
    this.cache.set(environment, resolved);
    return resolved;
  }

  private compute(environment: WorkerEnvironment): ResolvedSecurityConfig {
    const issues: string[] = [];
    const config = structuredClone<SecurityConfig>(this.base);
    for (const override of NUMERIC_OVERRIDES) {
      const raw = environment[override.variable];
      if (raw === undefined || raw === "") continue;
      const value = typeof raw === "string" ? parseInteger(raw) : undefined;
      if (value === undefined || value < override.min || value > override.max) {
        issues.push(`${override.variable} must be a whole number from ${override.min} to ${override.max}`);
        continue;
      }
      assign(config, override.path, value);
    }
    return { config, issues };
  }
}

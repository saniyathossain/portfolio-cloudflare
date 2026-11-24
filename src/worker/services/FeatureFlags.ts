import type { WorkerEnvironment } from "../types/WorkerEnvironment";

const TRUTHY = new Set(["1", "true", "on"]);
const FALSY = new Set(["0", "false", "off"]);

/** A flag in portfolio.json is either a bare boolean or `{ enabled: boolean }`. */
type JsonFlag = boolean | { readonly enabled?: unknown } | undefined;

/** Worker var → true / false, or null when unset or unrecognised (so the JSON default applies). */
export function readEnvironmentFlag(value: string | undefined): boolean | null {
  const normalized = (value ?? "").toLowerCase().trim();
  if (TRUTHY.has(normalized)) return true;
  if (FALSY.has(normalized)) return false;
  return null;
}

export function isMaintenanceOn(environment: WorkerEnvironment): boolean {
  return readEnvironmentFlag(environment.MAINTENANCE_MODE) === true;
}

function jsonFlagValue(flag: JsonFlag): boolean {
  if (typeof flag === "boolean") return flag;
  if (typeof flag === "object" && "enabled" in flag) return Boolean(flag.enabled);
  return false;
}

/** The Worker var wins over the JSON default when set. */
export function resolveFlag(flag: JsonFlag, environmentValue: string | undefined): boolean {
  return readEnvironmentFlag(environmentValue) ?? jsonFlagValue(flag);
}

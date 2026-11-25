import type { AssetBinding } from "../types/WorkerEnvironment";
import type { CspManifest } from "./headers";

/** Written next to the pages by scripts/csp-manifest.ts; never served to visitors (the Worker answers 404 for it). */
export const CSP_MANIFEST_PATH = "/_csp.json";

const HASH_PATTERN = /^sha256-[A-Za-z0-9+/]+={0,2}$/;
const HOST_PATTERN = /^https:\/\/[a-z0-9.-]+$/;

/** One lookup per isolate; a failed lookup is forgotten so the next request tries again. */
const cache = new WeakMap<AssetBinding, Promise<CspManifest | undefined>>();

function stringList(value: unknown, pattern: RegExp): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value as unknown[];
  return items.every((item): item is string => typeof item === "string" && pattern.test(item)) ? items : undefined;
}

export function parseCspManifest(value: unknown): CspManifest | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const source = value as Record<string, unknown>;
  const scriptHashes = stringList(source["scriptHashes"], HASH_PATTERN);
  const eventHandlerHashes = stringList(source["eventHandlerHashes"], HASH_PATTERN);
  const scriptHosts = stringList(source["scriptHosts"], HOST_PATTERN);
  if (!scriptHashes || !eventHandlerHashes || !scriptHosts) return undefined;
  return { scriptHashes, eventHandlerHashes, scriptHosts };
}

async function fetchManifest(assets: AssetBinding, origin: string): Promise<CspManifest | undefined> {
  try {
    const response = await assets.fetch(new Request(new URL(CSP_MANIFEST_PATH, origin)));
    return response.ok ? parseCspManifest(await response.json()) : undefined;
  } catch {
    return undefined;
  }
}

export function loadCspManifest(assets: AssetBinding, origin: string): Promise<CspManifest | undefined> {
  let pending = cache.get(assets);
  if (!pending) {
    pending = fetchManifest(assets, origin);
    cache.set(assets, pending);
    void pending.then((manifest) => {
      if (!manifest) cache.delete(assets);
    });
  }
  return pending;
}

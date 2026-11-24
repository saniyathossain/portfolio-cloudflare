/** The slice of a Workers KV namespace this Worker uses. */
export interface KvNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  list(options: { prefix: string; limit: number }): Promise<{ keys: readonly { name: string }[] }>;
}

export interface AssetBinding {
  fetch(request: Request): Promise<Response>;
}

export interface EmailBinding {
  send(message: unknown): Promise<void>;
}

/**
 * Everything wrangler.toml / the dashboard hands the Worker. Optional bindings are optional on purpose: every one
 * is guarded, so the site works before they are configured (docs/aidlc/38, 58). The index signature lets the
 * config-driven logger look up channel bindings by name.
 */
export interface WorkerEnvironment {
  readonly ASSETS: AssetBinding;
  readonly CONTACT_KV?: KvNamespace | undefined;
  readonly CONTACT_EMAIL?: EmailBinding | undefined;
  readonly CONTACT_FROM?: string | undefined;
  readonly CONTACT_TO?: string | undefined;
  readonly ADMIN_TOKEN?: string | undefined;
  readonly TURNSTILE_SECRET?: string | undefined;
  readonly MAINTENANCE_MODE?: string | undefined;
  readonly MAINTENANCE_TITLE?: string | undefined;
  readonly MAINTENANCE_MESSAGE?: string | undefined;
  readonly SKILLS_SCROLL_DESIGN?: string | undefined;
  readonly RATE_LIMITER?: unknown;
  readonly [binding: string]: unknown;
}

export interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

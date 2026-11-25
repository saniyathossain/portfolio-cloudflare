import type { StoredContactSubmission } from "../../types/StoredContactSubmission";
import type { Logger } from "../logging/Logger";
import type { KvNamespace } from "../types/WorkerEnvironment";

const KEY_PREFIX = "contact:";

/** Where contact submissions are kept. Swapping the backing store (KV → D1) means one new class, not a controller edit. */
export interface ContactSubmissionRepository {
  readonly isConfigured: boolean;
  /** Persists one submission; resolves false (never throws) so the visitor's request still succeeds. */
  save(record: StoredContactSubmission): Promise<boolean>;
  /** Newest first, at most `limit` entries; corrupt entries are skipped. */
  recent(limit: number): Promise<StoredContactSubmission[]>;
}

/** Workers KV implementation (`CONTACT_KV`). Without the binding every operation is a harmless no-op. */
export class KvContactSubmissionRepository implements ContactSubmissionRepository {
  constructor(
    private readonly store: KvNamespace | undefined,
    private readonly retentionSeconds: number,
    private readonly logger: Logger,
  ) {}

  get isConfigured(): boolean {
    return this.store !== undefined;
  }

  async save(record: StoredContactSubmission): Promise<boolean> {
    if (!this.store) return false;
    try {
      await this.store.put(`${KEY_PREFIX}${record.ts}:${crypto.randomUUID()}`, JSON.stringify(record), {
        expirationTtl: this.retentionSeconds,
      });
      return true;
    } catch (error) {
      this.logger.exception(
        { event: "contact_store_failed", location: "ContactSubmissionRepository.save", reason: "KV put failed; submission still accepted" },
        error,
      );
      return false;
    }
  }

  async recent(limit: number): Promise<StoredContactSubmission[]> {
    if (!this.store) return [];
    const { keys } = await this.store.list({ prefix: KEY_PREFIX, limit });
    const items: StoredContactSubmission[] = [];
    for (const key of keys) {
      const value = await this.store.get(key.name);
      if (value === null) continue;
      try {
        items.push(JSON.parse(value) as StoredContactSubmission);
      } catch {
        // A corrupt entry must not hide the others.
      }
    }
    return items.sort((first, second) => second.ts.localeCompare(first.ts));
  }
}

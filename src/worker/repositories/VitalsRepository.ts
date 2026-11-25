import type { StoredVitals } from "../../types/WebVitals";

/** Where page-view measurements are kept. The contract controllers and actions depend on; no query lives here. */
export interface VitalsRepository {
  readonly isConfigured: boolean;
  /** Stores one page view; resolves false (never throws) so the beacon is always answered. */
  save(row: StoredVitals): Promise<boolean>;
  /** Page views newer than `sinceIso`, newest first. */
  recent(sinceIso: string, limit: number): Promise<StoredVitals[]>;
}

import { desc, gte, lt } from "drizzle-orm";
import type { StoredVitals, VitalMetric } from "../../../types/WebVitals";
import { webVitals } from "../../database/schema";
import type { Database } from "../../database/types";
import type { Logger } from "../../logging/Logger";
import type { VitalsRepository } from "../VitalsRepository";

const MS_PER_DAY = 86_400_000;
const METRICS: readonly VitalMetric[] = ["lcp", "cls", "inp", "fcp", "ttfb", "tbt"];

type VitalsRow = typeof webVitals.$inferSelect;

function toRow(stored: StoredVitals): typeof webVitals.$inferInsert {
  const { metrics, ...rest } = stored;
  return {
    ...rest,
    lcp: metrics.lcp,
    cls: metrics.cls,
    inp: metrics.inp,
    fcp: metrics.fcp,
    ttfb: metrics.ttfb,
    tbt: metrics.tbt,
  };
}

function toStored(row: VitalsRow): StoredVitals {
  const { lcp, cls, inp, fcp, ttfb, tbt, ...withId } = row;
  const rest: Omit<typeof withId, "id"> & { id?: number } = withId;
  delete rest.id;
  const measured = { lcp, cls, inp, fcp, ttfb, tbt };
  const metrics: Partial<Record<VitalMetric, number>> = {};
  for (const metric of METRICS) {
    const value = measured[metric];
    if (value !== null) metrics[metric] = value;
  }
  return { ...rest, metrics };
}

/** Query-builder implementation: one prepared statement per call, no relational layer, so no overhead over raw SQL. */
export class DrizzleVitalsRepository implements VitalsRepository {
  constructor(
    private readonly database: Database | undefined,
    private readonly retentionDays: number,
    private readonly logger: Logger,
    /** 0..1 chance a save also prunes expired rows (keeps the table bounded without a cron). */
    private readonly pruneChance = 0.02,
    private readonly random: () => number = Math.random,
  ) {}

  get isConfigured(): boolean {
    return this.database !== undefined;
  }

  async save(row: StoredVitals): Promise<boolean> {
    if (!this.database) return false;
    try {
      await this.database.insert(webVitals).values(toRow(row));
      if (this.random() < this.pruneChance) await this.prune(this.database);
      return true;
    } catch (error) {
      this.logger.exception(
        {
          event: "vitals_store_failed",
          location: "DrizzleVitalsRepository.save",
          reason: "insert failed; beacon still answered",
        },
        error,
      );
      return false;
    }
  }

  async recent(sinceIso: string, limit: number): Promise<StoredVitals[]> {
    if (!this.database) return [];
    const rows = await this.database
      .select()
      .from(webVitals)
      .where(gte(webVitals.timestamp, sinceIso))
      .orderBy(desc(webVitals.timestamp))
      .limit(limit);
    return rows.map(toStored);
  }

  private async prune(database: Database): Promise<void> {
    const cutoff = new Date(Date.now() - this.retentionDays * MS_PER_DAY).toISOString();
    await database.delete(webVitals).where(lt(webVitals.timestamp, cutoff));
  }
}

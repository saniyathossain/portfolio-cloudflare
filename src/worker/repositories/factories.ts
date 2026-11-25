import { databaseManager } from "../database";
import type { Logger } from "../logging/Logger";
import type { LogRepository } from "./LogRepository";
import type { VitalsRepository } from "./VitalsRepository";
import type { LogEnvironment } from "../logging/createLogger";

/**
 * Where the active connection becomes a concrete repository (Laravel's service-container bindings). Callers get the
 * interface only. The ORM-backed classes are imported here, on demand: a request with no database connection (or one that
 * never reaches a repository, like every static page) pays nothing for the ORM.
 */
export async function createVitalsRepository(
  environment: LogEnvironment,
  retentionDays: number,
  logger: Logger,
): Promise<VitalsRepository> {
  const database = await databaseManager.connection(environment);
  const { DrizzleVitalsRepository } = await import("./drizzle/DrizzleVitalsRepository");
  return new DrizzleVitalsRepository(database, retentionDays, logger);
}

/** `undefined` when there is no database, so the log channel stays silent instead of failing. */
export async function createLogRepository(environment: LogEnvironment): Promise<LogRepository | undefined> {
  const database = await databaseManager.connection(environment);
  if (!database) return undefined;
  const { DrizzleLogRepository } = await import("./drizzle/DrizzleLogRepository");
  return new DrizzleLogRepository(database);
}

import { DatabaseDriver } from "../../enums/DatabaseDriver";
import type { ConnectionConfig, DatabaseConfig } from "../../types/DatabaseConfig";
import { connectD1 } from "./drivers/d1";
import type { Database, DatabaseEnvironment } from "./types";

type ConnectionOf<TDriver extends DatabaseDriver> = Extract<ConnectionConfig, { driver: TDriver }>;

/** One factory per driver: supporting a new store means adding a case here, not editing a switch. */
const DRIVER_FACTORIES: {
  readonly [TDriver in DatabaseDriver]: (
    config: ConnectionOf<TDriver>,
    environment: DatabaseEnvironment,
  ) => Promise<Database | undefined>;
} = {
  [DatabaseDriver.D1]: (config, environment) => connectD1(environment[config.binding]),
  [DatabaseDriver.Null]: () => Promise.resolve(undefined),
};

/**
 * Resolves the active database connection (the Laravel `DB::connection()`): `DB_CONNECTION` (Worker var) picks a named
 * connection from src/content/database.json, otherwise `default`. `undefined` means "no database": repositories then
 * degrade to no-ops, so the site works before a database is bound.
 */
export class DatabaseManager {
  constructor(private readonly config: DatabaseConfig) {}

  async connection(environment: DatabaseEnvironment): Promise<Database | undefined> {
    const requested = environment["DB_CONNECTION"];
    const name =
      typeof requested === "string" && requested in this.config.connections ? requested : this.config.default;
    const connection = this.config.connections[name];
    if (!connection) return undefined;
    const factory = DRIVER_FACTORIES[connection.driver] as (
      config: ConnectionConfig,
      environment: DatabaseEnvironment,
    ) => Promise<Database | undefined>;
    return factory(connection, environment);
  }
}

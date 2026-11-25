import databaseConfigJson from "../../content/database.json";
import type { DatabaseConfig } from "../../types/DatabaseConfig";
import { DatabaseManager } from "./DatabaseManager";

/** Validated by `databaseSchema` in the test suite; the cast here is a typed contract, not a guess. */
export const databaseConfig = databaseConfigJson as unknown as DatabaseConfig;

/** Shared by repositories and the `database` log channel; stateless apart from the per-binding handle cache. */
export const databaseManager = new DatabaseManager(databaseConfig);

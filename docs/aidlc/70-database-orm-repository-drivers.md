# 70 — Database layer: ORM, repositories, connection drivers

## Context
Doc 69 stored web vitals with hand-written D1 SQL inside the repository, and the `d1` log channel did the same. The owner
asked for an ORM without a performance cost, a Laravel-style driver switch from env, and the repository pattern for queries.

## Decisions
| Topic | Decision |
|---|---|
| ORM | **Drizzle ORM** `0.45.4`, SQLite dialect, query builder only (no relational API, no `drizzle-kit` at runtime). It compiles to the same prepared statements as hand SQL and is the lightest mainstream ORM with a D1 driver. |
| Connections | `src/content/database.json` (Zod: `src/schemas/databaseSchema.ts`) = Laravel `config/database.php`: `default` + named `connections`, each `{driver, …}`. Drivers: `d1` (`binding`) and `null` (no database). |
| Switching by env | Worker var `DB_CONNECTION=<name>` overrides `default` (unknown name → default). `DB_CONNECTION=null` turns every database feature off without a code change. |
| Resolver | `DatabaseManager.connection(env)` (`src/worker/database`) returns the ORM handle or `undefined`; one handle per binding is cached in a `WeakMap`. A new driver = enum case (`DatabaseDriver`) + connection schema case + one factory in `DatabaseManager` — same pattern as `LogDriver`. |
| Repository pattern | Contracts: `VitalsRepository`, `LogRepository` (+ existing `ContactSubmissionRepository`). Query code lives only in `repositories/drizzle/*`. Actions/controllers receive the contract; `repositories/factories.ts` is the single place a connection becomes a repository. |
| Schema | `src/worker/database/schema.ts` (sqlite-core). SQL migrations in `migrations/` stay the deployed truth; `tests/worker/database.test.ts` + `tests/support/sqliteTestDatabase.ts` apply them to a real in-memory SQLite (Node `node:sqlite` behind drizzle's `sqlite-proxy`) and run the repositories on it, so schema/migration drift fails CI. |
| One database | Logs and vitals share the default connection, binding `DB` (was `LOG_DB` / `VITALS_DB`). Log channel `database` lost its `binding`/`table` keys (`LogDriver.D1` → `LogDriver.Database`). |

## Performance
Measured, not assumed (Node; real D1 latency dominates in production):
| | before | after |
|---|---|---|
| Worker bundle (wrangler, unminified / gzip) | 91.7 KiB / 25.1 KiB | 308.5 KiB / 62.9 KiB (limit 3 MiB gzip) |
| Module start-up (median) | 2.0 ms | 3.9 ms minified (+1.9 ms parse) |
| Static page request | — | no ORM code runs: `drizzle-orm` is imported on first database use (`connectD1`, `repositories/factories.ts`) |
| Insert (one page view) | 0.004 ms raw | 0.046 ms ORM (+0.04 ms) |
| Select 2000 rows → objects | 8.2 ms | 13.7 ms (+5.4 ms) |

The select cost matters on the free plan (10 ms CPU per request), so the owner summary defaults to `limit=500` (max 2000;
`src/content/vitals.json`). Actions resolve the repository only after their cheap gates (feature flag, origin, bot, rate limit, auth).

## Adding another store
- **Another SQLite-family driver (libSQL/Turso):** `npm i @libsql/client`, add `DatabaseDriver.Libsql`, a `connectLibsql(env)` returning
  `drizzle-orm/libsql`'s handle (same `Database` type), a connection in `database.json`. Repositories are untouched.
- **Different dialect (Postgres via Hyperdrive):** needs a `pg-core` schema and `repositories/postgres/*` implementing the same
  contracts, chosen in `factories.ts` by the connection's dialect. Not built (no use case yet).

## Verification
tsc, eslint, vitest 148 tests clean. Real local D1 (`wrangler dev --persist-to`, binding `DB`, migrations applied): three
beacons stored via Drizzle, `GET /api/vitals` summarised them; with `--var DB_CONNECTION:null` the same endpoint answered
`vitals_db_not_configured`. Not run against a remote D1 (needs a real database id).

## Files
`src/enums/DatabaseDriver.ts`, `src/content/database.json`, `src/schemas/databaseSchema.ts`, `src/types/DatabaseConfig.ts`,
`src/worker/database/{index,DatabaseManager,schema,types}.ts`, `src/worker/database/drivers/d1.ts`,
`src/worker/repositories/{VitalsRepository,LogRepository,factories}.ts`, `src/worker/repositories/drizzle/*`,
`src/worker/logging/channels/DatabaseChannel.ts` (replaces `D1Channel`), `tests/support/sqliteTestDatabase.ts`, `tests/worker/database.test.ts`.

## Open questions
- `ContactSubmissionRepository` is still KV-only; a `database` implementation (table + migration) would let `DB_CONNECTION` cover contact too.
- Minifying the Worker (`minify = true` in `wrangler.toml`) would cut the bundle ~55 % and recover most of the start-up cost.

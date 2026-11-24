-- Schema for the `database` log channel (driver: d1, see src/content/logging.json).
-- Apply:  npx wrangler d1 execute <DB_NAME> --file=migrations/0001_create_logs_table.sql
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  level TEXT NOT NULL,
  actor TEXT NOT NULL,
  event TEXT NOT NULL,
  location TEXT NOT NULL,
  reason TEXT NOT NULL,
  request_id TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS logs_timestamp_idx ON logs (timestamp);
CREATE INDEX IF NOT EXISTS logs_request_id_idx ON logs (request_id);

-- Real-user Web Vitals (docs/aidlc/69): one row per sampled page view.
-- Apply:  npx wrangler d1 execute <DB_NAME> --file=migrations/0002_create_web_vitals_table.sql
-- Bind the database as VITALS_DB in wrangler.toml. No IP address, cookie or user id is stored.
CREATE TABLE IF NOT EXISTS web_vitals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  page TEXT NOT NULL,
  navigation_type TEXT NOT NULL,
  country TEXT NOT NULL,
  device_type TEXT NOT NULL,
  device_vendor TEXT NOT NULL,
  device_model TEXT NOT NULL,
  browser TEXT NOT NULL,
  browser_version TEXT NOT NULL,
  os TEXT NOT NULL,
  os_version TEXT NOT NULL,
  effective_connection TEXT NOT NULL,
  save_data INTEGER NOT NULL,
  viewport_width INTEGER NOT NULL,
  viewport_height INTEGER NOT NULL,
  device_pixel_ratio REAL NOT NULL,
  memory_gb REAL NOT NULL,
  cores INTEGER NOT NULL,
  lcp REAL,
  cls REAL,
  inp REAL,
  fcp REAL,
  ttfb REAL,
  tbt REAL,
  attribution TEXT NOT NULL,
  sections TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS web_vitals_timestamp_idx ON web_vitals (timestamp);
CREATE INDEX IF NOT EXISTS web_vitals_device_type_idx ON web_vitals (device_type);

-- Siete Parts Locator — shared state for Cloudflare D1.
-- The Excel data itself lives in inventory-data.js and is never written to.
-- These tables hold only what people change on top of it.

CREATE TABLE IF NOT EXISTS overrides (
  id      TEXT PRIMARY KEY,   -- Item number from the sheet
  data    TEXT NOT NULL,      -- JSON: only the fields that differ from the sheet
  updated INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS added (
  id      TEXT PRIMARY KEY,   -- "new-<timestamp>"
  data    TEXT NOT NULL,      -- JSON: the whole part record
  created INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS history (
  seq     INTEGER PRIMARY KEY AUTOINCREMENT,
  ts      INTEGER NOT NULL,
  who     TEXT NOT NULL,      -- initials entered at the confirmation
  part_id TEXT NOT NULL,
  part    TEXT NOT NULL,      -- description at the time of the change
  changes TEXT NOT NULL       -- JSON: [{ f, from, to }]
);

CREATE INDEX IF NOT EXISTS history_recent ON history (seq DESC);

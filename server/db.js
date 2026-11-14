import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'koaplay.db');
const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT DEFAULT '',
    maps_url TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    host_token TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    creator_name TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'direct',
    status TEXT NOT NULL DEFAULT 'scheduled',
    final_start_at TEXT,
    final_end_at TEXT,
    location_name TEXT DEFAULT '',
    location_address TEXT DEFAULT '',
    location_maps_url TEXT DEFAULT '',
    quota INTEGER NOT NULL DEFAULT 4,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS poll_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    start_at TEXT NOT NULL,
    end_at TEXT,
    note TEXT DEFAULT '',
    FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS poll_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    option_id INTEGER NOT NULL,
    schedule_id INTEGER NOT NULL,
    participant_name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(option_id, participant_name),
    FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS rsvps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    participant_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('attending', 'maybe', 'declined')),
    note TEXT DEFAULT '',
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(schedule_id, participant_name),
    FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    actor_name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
  );
`);

export default db;

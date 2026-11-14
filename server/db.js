import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PG_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const IS_VERCEL = Boolean(process.env.VERCEL);

let pool = null;
let sqliteDb = null;
let initPromise = null;

function convertPlaceholders(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

async function getSqlite() {
  if (sqliteDb) return sqliteDb;
  const { DatabaseSync } = await import('node:sqlite');
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  sqliteDb = new DatabaseSync(path.join(dataDir, 'koaplay.db'));
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  return sqliteDb;
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: PG_URL,
      ssl: PG_URL.includes('localhost') || PG_URL.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function initDb() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (PG_URL) {
      const p = getPool();
      await p.query(`
        CREATE TABLE IF NOT EXISTS locations (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          address TEXT DEFAULT '',
          maps_url TEXT DEFAULT '',
          created_at TEXT DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS schedules (
          id SERIAL PRIMARY KEY,
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
          teams_json TEXT DEFAULT NULL,
          created_at TEXT DEFAULT '',
          updated_at TEXT DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS poll_options (
          id SERIAL PRIMARY KEY,
          schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
          start_at TEXT NOT NULL,
          end_at TEXT,
          note TEXT DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS poll_votes (
          id SERIAL PRIMARY KEY,
          option_id INTEGER NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
          schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
          participant_name TEXT NOT NULL,
          created_at TEXT DEFAULT '',
          UNIQUE(option_id, participant_name)
        );

        CREATE TABLE IF NOT EXISTS rsvps (
          id SERIAL PRIMARY KEY,
          schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
          participant_name TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('attending', 'maybe', 'declined')),
          note TEXT DEFAULT '',
          updated_at TEXT DEFAULT '',
          UNIQUE(schedule_id, participant_name)
        );

        CREATE TABLE IF NOT EXISTS activity_logs (
          id SERIAL PRIMARY KEY,
          schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
          actor_name TEXT NOT NULL,
          action_type TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at TEXT DEFAULT ''
        );
      `);
      return;
    }

    if (IS_VERCEL) {
      throw new Error(
        'DATABASE_URL belum diatur di Vercel. Tambahkan Neon/Postgres Storage di dashboard Vercel lalu redeploy.'
      );
    }

    const db = await getSqlite();
    db.exec(`
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
        teams_json TEXT DEFAULT NULL,
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

    const scheduleCols = db.prepare('PRAGMA table_info(schedules)').all();
    if (!scheduleCols.some((col) => col.name === 'teams_json')) {
      db.exec('ALTER TABLE schedules ADD COLUMN teams_json TEXT DEFAULT NULL');
    }
  })().catch((err) => {
    initPromise = null;
    throw err;
  });

  return initPromise;
}

export async function queryAll(sql, params = []) {
  await initDb();
  if (PG_URL) {
    const res = await getPool().query(convertPlaceholders(sql), params);
    return res.rows;
  }
  const db = await getSqlite();
  return db.prepare(sql).all(...params);
}

export async function queryOne(sql, params = []) {
  await initDb();
  if (PG_URL) {
    const res = await getPool().query(convertPlaceholders(sql), params);
    return res.rows[0] || null;
  }
  const db = await getSqlite();
  return db.prepare(sql).get(...params) || null;
}

export async function execute(sql, params = []) {
  await initDb();
  if (PG_URL) {
    const res = await getPool().query(convertPlaceholders(sql), params);
    return { changes: res.rowCount || 0 };
  }
  const db = await getSqlite();
  const res = db.prepare(sql).run(...params);
  return { changes: res.changes || 0 };
}

export async function insertReturningId(sql, params = []) {
  await initDb();
  if (PG_URL) {
    const res = await getPool().query(`${convertPlaceholders(sql)} RETURNING id`, params);
    return Number(res.rows[0].id);
  }
  const db = await getSqlite();
  const res = db.prepare(sql).run(...params);
  return Number(res.lastInsertRowid);
}

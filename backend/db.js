const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'tracker.db'));

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS trackers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    type TEXT NOT NULL DEFAULT 'custom',
    icon TEXT DEFAULT 'target',
    color TEXT DEFAULT '#6366f1',
    unit TEXT DEFAULT 'sessions',
    goal_total INTEGER DEFAULT 0,
    goal_frequency TEXT DEFAULT 'daily',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS tracker_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tracker_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    completed_at TEXT,
    FOREIGN KEY (tracker_id) REFERENCES trackers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tracker_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    value REAL DEFAULT 1,
    notes TEXT DEFAULT '',
    item_ids TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (tracker_id) REFERENCES trackers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS streaks (
    tracker_id INTEGER PRIMARY KEY,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_logged_date TEXT,
    streak_start_date TEXT,
    FOREIGN KEY (tracker_id) REFERENCES trackers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// node:sqlite uses prepare().all() / .get() / .run() — same API as better-sqlite3
// Wrap prepare to add transaction helper
db.transaction = (fn) => {
  return (...args) => {
    db.exec('BEGIN');
    try {
      const result = fn(...args);
      db.exec('COMMIT');
      return result;
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  };
};

const defaultSettings = [
  ['ollama_model', 'llama3'],
  ['ollama_url', 'http://localhost:11434'],
];
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [key, value] of defaultSettings) insertSetting.run(key, value);

module.exports = db;

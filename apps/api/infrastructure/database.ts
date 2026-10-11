import {DatabaseSync} from 'node:sqlite';
import {mkdirSync, readFileSync} from 'node:fs';
import {dirname} from 'node:path';

export function openDatabase(path: string): DatabaseSync {
  mkdirSync(dirname(path), {recursive: true});
  const db = new DatabaseSync(path);
  db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
  db.exec('CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  const latest = db.prepare('SELECT max(version) version FROM migrations').get()?.version;
  if (typeof latest === 'number' && latest > 1) throw new Error('FUTURE_DATABASE_VERSION');
  if (!latest) {
    db.exec('BEGIN IMMEDIATE');
    try {
      // API and worker may boot together; recheck after acquiring the write lock.
      if (!db.prepare('SELECT version FROM migrations WHERE version = 1').get()) {
        db.exec(readFileSync(new URL('./migrations/001-local.sql', import.meta.url), 'utf8'));
        db.prepare('INSERT INTO migrations VALUES (1, ?)').run(new Date().toISOString());
      }
      db.exec('COMMIT');
    } catch (e) {db.exec('ROLLBACK'); db.close(); throw e;}
  }
  return db;
}

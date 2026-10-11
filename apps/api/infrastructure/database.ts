import {DatabaseSync} from 'node:sqlite';
import {mkdirSync, readFileSync} from 'node:fs';
import {dirname} from 'node:path';

export function openDatabase(path: string): DatabaseSync {
  mkdirSync(dirname(path), {recursive: true});
  const db = new DatabaseSync(path);
  db.exec('PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
  // Two processes may create a fresh file together. Switching journal mode can
  // return SQLITE_BUSY immediately even with busy_timeout; retry only this startup step.
  for(let attempt=0;;attempt++){
    try{db.exec('PRAGMA journal_mode=WAL');break;}
    catch(error){if(!(error instanceof Error && 'errcode' in error && error.errcode===5) || attempt>=20){db.close();throw error;}Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,50);}
  }
  db.exec('CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  const latest = db.prepare('SELECT max(version) version FROM migrations').get()?.version;
  if (typeof latest === 'number' && latest > 2) throw new Error('FUTURE_DATABASE_VERSION');
  for(const [version,file] of [[1,'001-local.sql'],[2,'002-transcripts.sql']] as const) {
    db.exec('BEGIN IMMEDIATE');
    try {
      // API and worker may boot together; recheck after acquiring the write lock.
      if (!db.prepare('SELECT version FROM migrations WHERE version = ?').get(version)) {
        db.exec(readFileSync(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
        db.prepare('INSERT INTO migrations VALUES (?, ?)').run(version,new Date().toISOString());
      }
      db.exec('COMMIT');
    } catch (e) {db.exec('ROLLBACK'); db.close(); throw e;}
  }
  return db;
}

-- Rebuild only jobs to extend its CHECK; preserve every existing job and lease.
ALTER TABLE jobs RENAME TO jobs_v1;
DROP INDEX jobs_dispatch;
CREATE TABLE jobs (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), owner TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('import','export','transcription')), status TEXT NOT NULL,
 payload_json TEXT NOT NULL, progress REAL NOT NULL DEFAULT 0, stage TEXT NOT NULL, error TEXT, result_json TEXT,
 lease TEXT, lease_until INTEGER, attempts INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
INSERT INTO jobs SELECT * FROM jobs_v1;
DROP TABLE jobs_v1;
CREATE INDEX jobs_dispatch ON jobs(status, lease_until, created_at);
CREATE TABLE transcripts (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), asset_id TEXT NOT NULL REFERENCES assets(id),
 job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id), hash TEXT NOT NULL, metadata_json TEXT NOT NULL
);
CREATE INDEX transcripts_project ON transcripts(project_id, asset_id);
CREATE TABLE transcription_requests (
 project_id TEXT NOT NULL REFERENCES projects(id), request_id TEXT NOT NULL, job_id TEXT NOT NULL REFERENCES jobs(id),
 asset_id TEXT NOT NULL, language TEXT NOT NULL, PRIMARY KEY(project_id, request_id)
);
CREATE TABLE transcription_chunks (
 job_id TEXT NOT NULL REFERENCES jobs(id), chunk_index INTEGER NOT NULL, response_json TEXT NOT NULL,
 PRIMARY KEY(job_id, chunk_index)
);

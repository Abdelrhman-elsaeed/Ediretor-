CREATE TABLE projects (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, name TEXT NOT NULL,
 revision_id TEXT NOT NULL, state_json TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX projects_owner_updated ON projects(owner, updated_at DESC);
CREATE TABLE revisions (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
 parent_id TEXT, document_json TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE commits (
 project_id TEXT NOT NULL REFERENCES projects(id), command_id TEXT NOT NULL,
 payload TEXT NOT NULL, result_json TEXT NOT NULL, PRIMARY KEY(project_id, command_id)
);
CREATE TABLE assets (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
 metadata_json TEXT NOT NULL
);
CREATE TABLE jobs (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), owner TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('import','export')), status TEXT NOT NULL,
 payload_json TEXT NOT NULL, progress REAL NOT NULL DEFAULT 0,
 stage TEXT NOT NULL, error TEXT, result_json TEXT,
 lease TEXT, lease_until INTEGER, attempts INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX jobs_dispatch ON jobs(status, lease_until, created_at);

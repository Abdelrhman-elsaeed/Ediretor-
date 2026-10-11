# Phase 01 local runtime contract

Active implementation contract, 2026-10-11. Supersedes earlier proposed infrastructure for this slice; see ADR-08. This is the maintained local application, not another feasibility harness. It is not a release qualification.

`ProjectDocument.schemaVersion = 1` uses decimal-string microseconds on the wire and BigInt in calculations. Clip occurrence fields are `id`, `assetId`, `trackId`, `sourceInUs`, `durationUs`, `sequenceStartUs`. Tracks are `picture` (video) and `sound` (linked source audio). There is one ordered sequence of contiguous 1× video occurrences; source audio is derived from the same occurrence intervals, including silent sources. Separate simultaneous sources, arbitrary track controls, speed changes, and overlays are rejected by the current schema rather than silently omitted.

`InsertClip`, `SplitClip`, `TrimClip`, and `RippleDeleteRange` apply through the kernel. Batches are atomic. History retains the last 100 local editing states with a persisted cursor; editing after undo branches. Every acknowledged save creates an immutable revision. Old revisions and command receipts are retained in SQLite; history UI/retention and paged audit browsing are deferred. No video bytes or progress go into the editing document. Source files are hashed and referenced by opaque storage keys, never client paths.

The project service revalidates ownership, references, and commands. A save envelope has `commandId`, `baseRevisionId`, and ordered edit/undo/redo actions. SQLite `BEGIN IMMEDIATE` atomically stores state, revision and command receipts. Replaying the same save request returns the same acknowledgement; changing its payload fails. A stale base is `REVISION_CONFLICT`, never last-write-wins. Browser pending actions are versioned by project and base revision; failed/in-flight requests retain the exact request ID for acknowledgement-loss retries. Conflict recovery downloads a JSON backup before explicit reload. The backup is for retaining/diagnosing pending work; importing/merging recovery JSON is not yet supported. Browsers that cannot write recovery storage show an error; the pending guarantee depends on available browser storage.

The API binds to `127.0.0.1`, allows local origins only, and refuses any profile other than `local`. All project/media/job queries check the local owner. This is not hosted authentication. The production build is served by the local API; Vite is only the development shell.

Imports stream bytes to disk with actual upload feedback, enqueue durable jobs, then probe/hash/generate a 1080p CFR preview and thumbnail in the worker. Processing progress uses FFmpeg output timestamps; probing/hashing/validation use indeterminate progress. A silent video is supported. Browser preview seeks source seconds even for VFR rather than treating original frame indexes as proxy indexes; broad VFR/drift qualification remains deferred.

Exports pin a saved document/profile/runtime and verify originals against saved hashes. The shared compiler derives frame boundaries without accumulation; sub-frame cuts cannot be exported. Per-segment software H.264/AAC encoding and concatenation happen outside the UI/API; final frame count, frame rate, canvas, duration and full decode are validated before a downloadable result is published. Native cuts export is distinct from deferred Remotion graphics qualification. Limits: 600 seconds / 200 clips, 1920×1080 at 30/1. Canvas stays fixed for this slice; no dead profile or renderer selector is displayed.

SQLite jobs support one worker at a time, 10-second leases, 500ms heartbeats, per-attempt UUID fencing, maximum three automatic crash recoveries, explicit terminal retry, and cancellation. Output keys are per attempt. Only a live lease can publish a result pointer or import an asset. Cancelling or losing the lease stops native execution; a stale worker cannot publish a partial file. Jobs survive API/worker restart. Work directories are removed after completed attempts. Crash orphan files and retained upload staging files require a later reference-aware retention/scavenging policy; no broad deletion of user originals is implemented.

| Route | Effect |
|---|---|
| `GET /api/health` | local profile and media-tool availability |
| `GET/POST /api/projects` | filtered, paged library / create |
| `GET /api/projects/:id` | saved state, history cursor, media catalog |
| `POST /api/projects/:id/import?name=…` | streaming upload and durable ingest |
| `POST /api/projects/:id/save` | atomic commit with optimistic concurrency |
| `POST /api/projects/:id/export` | pinned saved revision enqueue |
| `GET /api/projects/:id/jobs` | latest 30 project jobs |
| `GET /api/assets/:project/:asset/proxy` | owned media with byte ranges |
| `GET /api/assets/:project/:asset/thumbnail` | owned thumbnail |
| `GET /api/jobs/:id` | durable progress/status |
| `POST /api/jobs/:id/cancel` | terminal cancellation |
| `POST /api/jobs/:id/retry` | retry same immutable payload |
| `GET /api/jobs/:id/download` | validated, published export only |

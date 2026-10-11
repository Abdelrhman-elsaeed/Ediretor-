# Phase 01 implementation evidence — 2026-10-11

The actual local frontend and its application/persistence/media pieces are implemented. **The supported Phase 01 vertical workflow passes the recorded checks. This is not a production release qualification.** Phase 00 renderer qualification remains deferred/no-go; Q05/Q06 incomplete and Q10 visual parity failed are preserved. Figma was cancelled by the user, and no Figma artifact is claimed.

Environment: existing Windows host from [environment.json](environment.json), Node 24.16.0, React 19.1.0, TypeScript 5.9.3, Vite 8.3.4, Playwright 1.62.1 Chromium, native FFmpeg/ffprobe N-122319-gf6a95c7eb7-20251231. Built frontend served by the local Node API; a separate worker process executes native media tools. No commit, push or deployment. Pre-existing edits and evidence were retained.

Implemented: Arabic RTL library/search/pagination; create and streaming video import; actual upload/processing/cancel/retry states; native probe, hashes, CFR preview and thumbnails; editor with media/preview/timeline/inspector; insert, frame-aligned split, trim, ripple delete; linked source audio; persisted undo/redo; pending recovery and atomic revision save; optimistic concurrency; pinned export jobs, cancellation, lease recovery/fencing, validation and download. The timeline always advances LTR, with literal source pixels never mirrored. Both themes, visible keyboard focus, keyboard shortcuts, reduced motion and narrower layouts are implemented. Later features are described as later scope, with no dead controls.

The production implementation reuses the existing pure `cutClip`, interval normalization/mapping, integer microseconds, and rational frame conversions. The new schema/kernel and shared compiler extend those modules. The React shell, Project Session, application services, SQLite migration/repository, local transport and worker were implemented here; no legacy code was modified or used through an absolute runtime path. The existing licensed Noto Sans Arabic fixture was copied with its OFL into the shipped frontend. Remotion graphics and scene caches remain in the preserved experiment, outside this cuts-only slice.

Executed commands:

```powershell
npx.cmd skills add anthropics/skills --skill frontend-design --agent codex --yes
npx.cmd skills add vercel-labs/agent-skills --skill vercel-react-best-practices web-design-guidelines --agent codex --yes
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
git diff --check
```

Skills installed project-locally and read alongside the maintained architecture skill. Existing skills were preserved. The interface was reviewed against the fetched [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), with the user's visual brief taking precedence over generic examples.

Typecheck and production build passed. Final verification: **127 tests / 10 files passed**, including the existing 105 Phase 00 tests and a real native subprocess cancellation test. No long benchmarks were restarted. `git diff --check` passed.

The successful browser run is [workflow-2026-10-11.json](phase-01/workflow-2026-10-11.json), captured 08:30–08:31 Africa/Cairo (05:30–05:31 UTC). Full artifacts and isolated persisted data remain in `artifacts/phase-01-2026-10-11T05-30-08-585Z`. The fixture is existing `real.mp4`: licensed real flower footage with synthetic frame/audio markers, not Arabic speech. A one-second silent gray fixture and a deliberately corrupt upload were also exercised. No production mock projects are seeded; screenshots contain only projects created by the test.

| Acceptance / risk | Observed result |
|---|---|
| P01-A1 import → split → delete middle → save → reopen | Source intervals `[0,3)` and `[6,16)`, contiguous 13-second sequence; source file hash unchanged. API + worker restart retains project/history/export. |
| P01-A2 atomic commands / undo / redo / idempotency | Kernel and SQLite tests pass rollback, branch history, duplicate delivery/mismatched payload; browser undo/redo survives reload. |
| P01-A3 stale clients / save failure | Actual save connection abort remains visibly dirty; reload restores pending edits; retry saves. Second client produces HTTP 409 and visible conflict; recovery JSON downloads before explicit reload. |
| P01-A4 immutable export | Export pinned to an 11-second saved revision; editing to a newer revision during encoding does not change its content. 1920×1080, 30/1, 330 video frames, 11.000000s; full decode passes before publication. |
| Preview / export source mapping | Preview crosses the removed source range. Export markers at sequence 1/4/9s map to source 1/7/12s. Sampled 320×180 luma differences against the proxy: 0 / 0.321788 / 0. |
| Audio alignment | Pulse onsets at sequence 1/4/9s each differ by +0.020833ms, within the unchanged 40ms target. This is a short fixture result, not long-duration drift qualification. |
| P01-A5 worker death / cancellation / ownership | Worker killed during encoding; next process reclaims the expired lease and publishes one validated result (attempt 2). Cancelled job has no download. Repository tests reject stale/cancelled lease publication and cross-owner project/media/job access. |
| Loading / empty / error / missing media / silent input | Browser library loading, empty, failed load/retry, save recovery, revision conflict, missing preview and corrupt import states exercised. Missing original fails export enqueue. Silent video imports and exports. |
| Browser console | Zero unexpected browser errors. Injected `net::ERR_FAILED` and the expected 409 conflict are recorded separately. |

Screenshots were captured at 1920, 1440, 1280, 900, 760 and 390px; document width stayed within each viewport. Reviewed desktop and narrower screenshots in both themes, including the tablet inspector. The small ruler originally crowded labels; labels now reduce at phone widths, and the media action is fully reachable. The tablet inspector can be shown/hidden; phone layout stacks media and preview instead of hiding essential workflow actions.

Retained review images: [desktop light](phase-01/screenshots/editor-1440-light.png), [desktop dark](phase-01/screenshots/editor-1440-dark.png), [narrow light](phase-01/screenshots/editor-900-light.png), [narrow dark](phase-01/screenshots/editor-900-dark.png), [phone dark](phase-01/screenshots/editor-390-dark.png), [library](phase-01/screenshots/library-populated-light.png), [revision conflict](phase-01/screenshots/revision-conflict.png). Other failure/loading/import/export screenshots remain with the full artifact run.

Measured semantic contrast ratios: light primary 14.77, secondary 4.98, copper button 5.72, success 6.04; dark primary 14.04, secondary 8.36, copper button 7.18, success 8.72. Focus against the panel surface is 4.68 light / 7.17 dark. Visible focus and Ctrl+Z / Ctrl+Shift+Z / Ctrl+S were exercised in the Arabic editor. Reduced-motion media preference was enabled during browser validation. This is targeted review, not a full screen-reader/a11y audit.

Build output separates the library, editor, import and export modules. Main bundle is about 254kB (76.7kB gzip), editor 31.3kB (9.5kB gzip), stylesheet 23.1kB (5.4kB gzip); the Arabic font is separately served locally. Playback/drag time is held in the playback controller; the timeline updates DOM positions directly and only the small transport component samples display updates. Stable job polling does not rerender unchanged project state. Native processing stays out of the browser and API request execution. No Q05/Q06 responsiveness SLO is claimed.

Validation found and fixed: simultaneous API/worker migration startup race; `out_time_us=N/A` producing an invalid progress value; per-segment AAC padding adding a ~50.7ms post-cut offset (now exact-length PCM joins with one AAC encode); blocked inline theme script under the built-app CSP (now a local external script); narrow ruler overcrowding; keyboard shortcuts while a clip button is focused. Failed verification attempts remain in separate `artifacts/phase-01-*` directories, rather than overwriting their reports.

Deliberate limits/deferrals: 10-minute / 200-clip / 1080p30 export; no 4K export, multi-source simultaneous sync, transcripts, templates, graphics or AI. Source admission (2GiB / 4h / ≤3840×2160 / ≤120fps) is a validation bound, not measured long-source support. Broad VFR/media codec parity, long-duration resources, color/HDR/rotation behavior, and graphics qualification remain unproven. The installed FFmpeg build is an environment dependency; cross-build encoder equivalence is not claimed. Proxy creation must finish before browser editing that source; interactive work on another ready source continues while jobs run.

Remaining local hardening: reference-aware orphan/staging cleanup, retention/paged audit UI, database backup/restore qualification, recovery JSON merge/import, in-app source relinking, filesystem-full fault injection, and a full assistive-technology audit. History is bounded to the most recent 100 editing states; older immutable revisions remain in the database. Hosted auth/transport/queue adapter, install/update packaging and release qualification belong to later phases. Local identity is explicitly guarded; this service is loopback only.

Run from the workspace with `npm.cmd run dev` and open `http://127.0.0.1:4317`. For the built application, run `npm.cmd run build`, `npm.cmd start` and `npm.cmd run worker` (last two in separate terminals), then open `http://127.0.0.1:4318`. Keep `.local/ediretor` to retain user projects. See [runtime contract](../../specs/001-project-core/runtime-contract.md).

# Phase 00D — UI handoff contract map

Status, 2026-10-11: **visual/product contract reference; Figma cancelled by the user.** React implementation is authorized now. The original Figma checklist and proposed future screens below are historical scope, not active prerequisites. Current implementation decisions and supported states are in [ADR-08](../07-decisions.md) and the [runtime contract](../../specs/001-project-core/runtime-contract.md). Real browser screenshots and interaction evidence replace design-artifact review for this frontend request; they do not qualify the deferred renderer gates.

This document supplies visual/product vocabulary and contract context for the React/TypeScript application. Actual runtime contracts are now implemented for the bounded Phase 01 slice. Figma-specific annotations/checklists and future-phase concepts below are historical reference; the cancelled artifact and deferred renderer gate do not block this implementation. Visual review uses real browser screenshots and supported workflows.

## Contract maturity and phase boundaries

- The [data model](../04-data-model.md) defines **proposed domain contracts**, including `ProjectDocument`, `CommandEnvelope`, `CommandBatch`, and the command names below. The [architecture](../03-architecture.md) proposes Project Session `load / dispatch / flush / undo / redo` and Render Jobs `enqueue / status / cancel`; these are not implemented application APIs yet.
- Current source contains pure [clip cutting and source mapping](../../packages/domain/src/editing/cut-clip.ts) (`cutClip`, `sequenceToSource`) and a Phase 00 [render snapshot schema and compiler](../../experiments/render-feasibility/src/contract.ts) (`snapshotSchema`, `parseSnapshot`, `compile`). The experiment's `schemaVersion: 0` snapshot is not the complete production `ProjectDocument` or an implemented command bus.
- Query labels and application effects in the table below describe **proposed semantics**, not exported TypeScript symbols, endpoints, or settled DTO fields. UI status labels are likewise not a durable-job enum. Production wire schemas and error codes must be established in their implementation phase.
- [Phase 01](../../specs/001-project-core/spec.md) covers import, basic manual cuts, persistence, undo/redo, conflicts, preview, and durable export. Transcript/captions belong to Phase 02; expanded tracks, sync, and layout tools to 03; templates/scenes to 04; AI proposals and custom AI scenes to 05–06. The broader prototype documents future flows without making them Phase 01 requirements.

## Source of truth

- Persistent editing state is the versioned `ProjectDocument`, identified by `revisionId` and `parentRevisionId`.
- Editing changes enter through the shared Editing Kernel command contract. The UI does not mutate a clip, caption, layout, or graphic directly.
- Queries provide projections for project library, editor loading, transcript, timeline, inspector, revision history, and export jobs.
- Preview and export consume the same composition semantics. Export is pinned to a selected revision and its asset/template/font hashes.
- Selection, focus, open panels, playhead drag, zoom, and transient toasts are UI state. They must not become a second persistent editing model.

## Screen map and contract ownership

| Screen / flow | Proposed read semantics or input | Documented proposed commands / application effects | Persistent state represented | Design states to review |
|---|---|---|---|---|
| Project library | project summary projection | create project / import use cases; API names unresolved | project summary, current revision, related job summary | loading, empty, load failure; offline/archive behavior unresolved |
| New project / import | file picker plus asset metadata projection | media ingest/probe, then `ImportAssetRef`, `InsertClip` | asset identity, source metadata, related processing job | drop target, processing, unsupported, corrupt, missing audio, retry |
| Processing detail | job status projection / progress delivery to be specified | Media Pipeline status/cancel and application retry | related durable job record, outside ProjectDocument | queued, preparing, failed, cancelled, retrying; rendering/validating/publishing for exports |
| Editor shell | project/revision bootstrap projection | kernel commands dispatched by Project Session | clips, tracks, and source/sequence timing; later-phase captions/scenes/layout tools | initial load, empty timeline, missing asset, stale revision, recovery |
| Preview | composition projection at selected revision | seek/playback UI; no direct document mutation | selected revision and preview position | loading media, seeking, no audio, preview error, reduced motion |
| Transcript / captions (02) | transcript projection with occurrence-aware anchors | `CorrectWordText`, `SetCaptionStyle`; deletion maps to `RippleDeleteRange` | displayCorrections or non-destructive cut/anchor outcome; original transcript remains immutable | loading, no transcript, needs_review anchor, conflict, undo available |
| Timeline / inspector | selected clip occurrence and track projection | 01: `InsertClip`, `SplitClip`, `TrimClip`, `RippleDeleteRange`; later: `MoveClip`, `SetSyncOffset`, `LinkClips`, `SetPrimaryAudio`, `SetLayout`, `SetGain`, `AddScene`, `UpdateSceneProps`, `BindCue`, `RemoveItem` | one atomic CommandBatch and resulting revision; lock mutation contract remains unresolved | selection, invalid drop, locked item, pending save, command failure |
| Save / revision history | current revision and Project Session save status | Project Session dispatch/flush/undo/redo | immutable revision, parent revision, command IDs; pending commands retained separately for recovery | saved, unsaved, saving, save failed, base revision conflict |
| Export | available profiles and selected revision projections | Render Jobs enqueue/status/cancel; retry policy to specify | related export job pinned to ExportSnapshot and its hashes | profile validation, queued, progress, validating, publishing, failed, cancelled, completed |
| Settings / local runtime | settings and health projections; persistence scope unresolved | preference changes; no domain command names defined | proposed user/runtime preferences, separate from editing document unless they affect output | loading, unavailable storage, invalid setting, saved |

The screen labels are intentionally product-level. Transport adapters and persistence details do not belong in Figma annotations or React view components.

## State and interaction annotations

Every Figma frame should annotate these fields where applicable:

```text
source: ProjectDocument | revision | query projection | UI-only
read: query name and projection shape
write: documented proposed command name or application effect; commandId, baseRevisionId, atomic batch when applicable
failure: stable error code and recovery action
direction: rtl | ltr | bidi-island
time: source time | sequence time | scene time
```

Examples:

- A selected timeline clip must identify the clip occurrence and separate source time from sequence time. The Phase 00 snapshot uses `clips[].id`, `sourceInUs`, `durationUs`, and `sequenceStartUs`; the proposed data model uses `timelineStartUs` in its time equation and `clipId/occurrenceId` in anchors. Resolve this naming difference in the Phase 01 schema before treating Figma annotations as field names.
- “Unsaved” means the Project Session has pending commands. It is not a new revision and must remain visible if a save request fails.
- “Conflict” means the command used a stale `baseRevisionId`. Compare/reload are proposed recovery interactions; replan applies to later AI proposals. The implementation must preserve pending work and never silently overwrite a newer revision.
- “Export completed” is shown only after validation and publication of a job pinned to a revision. A partial file is never presented as a valid export.
- “Missing audio” is a supported asset state, not a corrupt-video error. Transcription is unavailable for that source while visual editing remains possible.

## Component inventory for the Figma handoff

Foundations: semantic surfaces, ink, rules, copper/ochre/moss/ember status roles, focus ring, Arabic and Latin typography, mono timecode, 4px spacing scale, 12px panel radius, restrained overlay elevation, and reduced-motion behavior.

Navigation and actions: workspace switcher, project card, left rail, top bar, command bar, button/icon-button, tabs, menu, combobox, segmented control, undo/redo, preview, export, and direction toggle.

Media and editing: source card, media/asset row, track header, timeline clip, playhead, ruler, timecode, waveform placeholder, caption cue, scene cue, transcript row, inspector section, property field, lock/sync marker.

Feedback and status: saved/unsaved/processing/conflict/failed/cancelled/locked badges, progress, skeleton, empty state, inline error, toast, modal, drawer, retry action, and revision history row.

Each component needs variants for default, hover, pressed, focus-visible, disabled, selected, loading, error, and keyboard interaction. Status colors must always be paired with text and/or an icon.

## Responsive and bidi rules to verify in Figma

- Target frames: 1280, 1440, and 1920 desktop widths, plus a tablet adaptation. The editor remains desktop-first; no separate mobile information architecture is introduced.
- RTL is the default for Arabic prose and navigation labels. English terms, code, IDs, filenames, and timecodes use explicit LTR islands with stable alignment.
- Mixed examples must include Arabic plus `React`, `TypeScript`, `FFmpeg`, IDs, decimal values, and `00:12:18:05` timecodes.
- Timeline time progression, transport arrow behavior, and seek-key behavior under RTL remain a design decision. Prototype an explicit LTR time axis within the RTL shell as a proposal, then record the reviewed rule; the documented LTR timecode text rule alone does not decide timeline direction. Video content must not be mirrored just because interface language changes.
- Keyboard order follows reading order, focus is visible on dark and light surfaces, and reduced motion removes nonessential looping effects.

## Open questions before Phase 01

1. Which Figma file and node IDs are the accepted source for tokens, components, and flows?
2. Which export profiles are in the first vertical slice? A queued ExportSnapshot is fixed; later profile edits require a new snapshot/job rather than mutating the running export.
3. What is the exact query projection for project cards and editor bootstrap, including offline/local recovery state?
4. Which command error codes are stable for conflict, missing asset, unsupported media, save failure, and export failure?
5. How does the local runtime expose durable job progress and cancellation to the Project Session?
6. Which font files and renderer/runtime versions are pinned into an export snapshot?
7. Which accessibility review evidence (contrast, keyboard traversal, reduced motion, bidi overflow) will be attached to the accepted Figma handoff?
8. Which timeline direction and seek-key behavior will Arabic/English layouts use, and what are the accepted clip/time field names in the Phase 01 schema?
9. Which prototype states are future concepts (archive, offline library, runtime settings), and which have defined behavior in the first slice?

## Acceptance checklist

- [ ] Figma file has Foundations, Components, Flows, Editor, States, and Handoff pages.
- [ ] Token export and component variants match this contract map.
- [ ] Clickable prototype covers import → processing → editor → edit → save → revision → export → failure/retry.
- [ ] Empty, loading, unsaved, conflict, missing asset/audio, cancelled, and failed states are represented.
- [ ] Arabic/English bidi behavior, timecode readability, keyboard focus, contrast, and responsive frames are reviewed.
- [ ] Each persistent state has a ProjectDocument/revision/command/query annotation.
- [ ] Annotations distinguish implemented Phase 00 functions, proposed production contracts, and later-phase capabilities.
- [ ] Figma link/export and resolved open questions are recorded before Phase 01.


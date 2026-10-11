# Phase 02 — actual application evidence

2026-10-11. The local application now supports real transcription, immutable transcripts, text corrections/cuts, virtual transcript browsing and Arabic/mixed captions. This is implementation in the existing editor, not another prototype. The full Phase 02 quality gate remains open for the longer mixed-speech Q01 review described below.

Implementation contract: [Phase 02 runtime](../../specs/002-transcript-editing/runtime-contract.md). Provider choice and caption strategy: ADR-09. Existing planning/evidence is preserved. No commit, push, deployment, Figma invocation or deferred renderer benchmark was performed.

## Recorded checks

- `npm.cmd run typecheck`: passed.
- `npm.cmd test`: **152 tests / 13 files passed**. Includes all 127 Phase 01 tests plus source/occurrence mapping, conservative cuts, corrections/history, captions/overflow, migration upgrade/concurrent startup, ownership, durable receipts/checkpoints, stale/cancelled publication, provider authentication/retry/cancellation/silence, timestamp repairs and chunk offsets/overlap ownership. Four independent processes successfully migrated one fresh database.
- `npm.cmd run build`: passed. Current main bundle approximately 259.3kB / 78.2kB gzip; editor 38.4kB / 12kB gzip; lazy transcript panel 8.9kB / 3.4kB gzip. Playback changes do not subscribe the editor tree.
- `npm.cmd run test:e2e:transcript`: passed with live Deepgram and actual media. Raw report and media: `artifacts/phase-02-2026-10-11T06-14-17-079Z`.
- `npm.cmd run test:e2e:transcript-states`: passed. Actual caption pixel/timing checks, 60k-word UI stress, silent input, unavailable/failure/loading/cancelled states and live zero-word transcription: `artifacts/phase-02-states-2026-10-11T06-16-34-083Z`.
- `npm.cmd run test:e2e`: final Phase 01 regression **passed** at `artifacts/phase-01-2026-10-11T06-18-38-824Z`. All 15 workflow results passed, including actual preview source mapping, save/recovery/conflict, immutable exports, real audio/frame markers, worker death/reclaim, API/worker restart, cancellation, missing/corrupt/silent media and keyboard focus. Zero unexpected browser errors; intentionally injected faults and API downtime are reported separately. The original earlier pass at `artifacts/phase-01-2026-10-11T05-55-29-547Z` is also preserved.

## Actual provider and media

[Public fixture provenance and license](phase-02/fixtures.md): 47.088345s of real Egyptian Arabic speech by Wikitongues, source hash `392f32bfd4f15f96343d85cd1a95487c99b24b712439215af9a72f4f21046ca0`. The original bytes were checked unchanged after the workflow. All application projects in screenshots were created by the test; no production fake transcripts/projects are seeded.

Deepgram adapter posted actual extracted WAV audio to the official pre-recorded endpoint with `nova-3`, `ar-EG`, explicit punctuation/utterances and no smart-format timing substitution. The successful recorded run returned **107 words**, actual model version **2026-01-27.33458**, normalization version `dg-words-v1`, and a separately retained raw response. Normalized transcript hash: `cdf794ff9101f3b55fe718b5e6992bb6b39b392e766aae6a753ec597de24dd10`. API and worker keys remain server-side in ignored environment configuration; keys are absent from evidence and browser assets.

The provider's final word exceeded source duration by approximately 0.87s in the observed raw response. Normalization now caps that bounded overshoot at source end, keeps the reported end plus a review flag, and leaves the raw response unchanged. Larger invalid overruns fail. Instantaneous-word repairs and these bounds are covered by tests. This observation is not a claim that all recognized word timings or spelling are accurate.

| Acceptance / risk | Actual evidence and limits |
|---|---|
| P02-A1 Arabic/mixed direction and confidence review | Real Arabic words/confidence are visible in RTL controls with LTR timecodes. A correction containing Arabic and `TypeScript` exercises real mixed-script preview/burn-in. Chromium screenshots were reviewed in light/dark at 1440, 900 and 390px. This does **not** establish mixed spoken technical vocabulary accuracy or a WER score. |
| P02-A2 immutable corrections and restoration | Source transcript hash/words remain byte-equivalent across correction, cut, undo/redo and reload. Correction changes display text without sequence duration/source timestamp changes. Undo restores exact clip intervals; Redo restores cuts and caption settings. Repeated source occurrence tests distinguish each appearance. |
| P02-A3 conservative text deletion | Real selected-word deletion removes only its occurrence and shortens a 12s edited sequence to 11.6s. 40ms silence padding, midpoint guards, frame rounding, adjacent/cross-boundary unions, file-edge clamps, stale anchors and overlapping retained speech are tested. Ambiguous selections fail rather than cutting retained speech. Audible naturalness on varied utterance boundaries still needs a broader human fixture review. |
| P02-A4 captions/export | Actual UI downloads SRT/VTT from the saved edited revision with corrected text. Burn-in export is 1920×1080, **30/1, 348 frames, 11.600000s**, with full native decode before publication. Raster font/geometry come from the same draw function as preview. Overflow is an explicit failure, not omitted captions. |
| P02-A5 silence/failure/duplicate/cancel | Native 1s silent video imports and API rejects transcription without creating a job. A 2s real silent audio stream reaches live Deepgram and stores **zero words**, with a visible no-speech state. Actual transcription cancellation leaves the prior transcript unchanged; retry is visible. Provider 401/retry/timeout/cancel behavior, duplicate receipts, checkpoint replay and stale/cancelled worker publication are tested. Browser unavailable/failed/loading states use explicit fault injection; no injected success words. |
| P02-A6 long text/chunks | 60,000 clearly synthetic words mounted **12 rows**, found the unique word, and scrolled to a distant index; recorded total load/search/scroll check ~2.88s under the local test load, not a controlled SLO. Chunk tests cover 120s windows, ±1s context, global offsets, midpoint ownership, dedup and genuine repeated speech preservation. No lengthy video benchmark was run. |

The primary real workflow had **zero browser errors**. Screenshot review found that the first transcript layout expanded to its full content height, which defeated virtualization; the fixed layout constrains the scroll viewport. The subsequent stress run confirms the bounded DOM. The existing warm palette, RTL shell, deliberate LTR timeline/timecodes, keyboard controls and narrower layouts remain. This is targeted browser/accessibility review, not a full screen-reader audit.

## Caption parity measurements

Pinned environment: Canvas contract `canvas-captions-v1`; Noto Sans Arabic font SHA-256 `63111b5b2e074dd48cc67692e0a2726d86ee94c1c37fe8598257b7b4e87e869e`; Playwright **1.62.1**, Chromium **151.0.7922.34**; FFmpeg **N-122319-gf6a95c7eb7-20251231**. The font license/source is already retained locally. Runtime and font changes after enqueue fail explicitly.

At sequence 1.8s, the actual preview Canvas PNG over the corresponding source proxy differs from the burned export's caption region by mean luma **0.931966 / 255**, below the test limit of 5. The full 1920×1080 preview raster and actual export frame remain in the artifact run; Arabic glyph joins, mixed Latin positioning, two-line wrapping and placement were visually inspected.

| Export frame | Sequence seconds | Sample | Caption-region mean luma difference |
|---|---:|---|---:|
| 47 | 1.566667 | Immediately before first cue | 0.645702 |
| 48 | 1.600000 | First cue activation | 0.675267 |
| 134 | 4.466667 | Before next cue | 0.972567 |
| 135 | 4.500000 | Next cue activation | 0.854120 |
| 281 | 9.366667 | Later cue after edited cut | 0.731505 |

This establishes sampled preview/burn-in agreement on this short Chromium fixture. It does not qualify all browsers, dense maximum-duration captions, 4K, HDR, all codecs, long-video timing drift or the deferred Remotion scene renderer.

Reviewed images: [desktop light](phase-02/screenshots/editor-1440-light.png), [desktop dark](phase-02/screenshots/editor-1440-dark.png), [narrow light](phase-02/screenshots/editor-900-light.png), [narrow dark](phase-02/screenshots/editor-900-dark.png), [phone dark](phase-02/screenshots/editor-390-dark.png), [large transcript](phase-02/screenshots/large-transcript.png), [silent source](phase-02/screenshots/silent-source.png), [no speech](phase-02/screenshots/no-speech.png), [provider unavailable](phase-02/screenshots/provider-unavailable.png), [failed provider](phase-02/screenshots/provider-failed.png), [cancelled](phase-02/screenshots/cancelled.png). Public media attribution/license: [fixture provenance](phase-02/fixtures.md).

## Reuse, corrections found and deliberate limits

Reused: Phase 01 editor shell/theme/timeline/preview, pure time/interval/cut modules, Project Session recovery/autosave/history, transactional SQLite receipts/revisions, local ownership/storage, native import/cuts/audio export and leased separate worker. Adapted legacy ideas: provider failure classification, raw/normalized separation, integer timing, utterance/confidence provenance and minimum-span repair. Reimplemented the Deepgram adapter for synchronous bounded pre-recorded requests and current model capabilities; no old callback-secret/queue/DB dependencies or legacy runtime paths were copied. Caption drawing and sparse raster composition are new within the existing native export path.

Verification found and corrected: Arabic text damage from an early shell text replacement (all affected UI strings restored); real provider source-end overshoot; final overlay dropping a frame without an explicit CFR output contract; unconstrained virtual viewport mounting the entire transcript; a fresh-file WAL initialization race between API and worker; long acoustic overlaps being lost by a naive occurrence search; overlap dedup accidentally treating real in-chunk repetitions as duplicates. Failed attempts remain in separate artifact runs. Browser test adjustments search before addressing a virtual row, wait for actual playback progression instead of a fixed buffering sleep, and separately record expected connection errors only during an intentionally stopped API; they do not weaken application save/export validation or hide ordinary failures.

Remaining qualification: the real fixture is 47s, not the specified 2–5min technical Arabic/English Q01 set. A human spelling/timing/naturalness review, measured recognition accuracy and true spoken technical code-switching remain unverified. No sample transcript or correction is presented as provider accuracy proof. Full T06/Phase 02 exit remains open for that evidence. Long job resource/cost behavior, many large concurrent transcript catalogs, transcription process-death recovery on real multi-chunk speech, full assistive-technology coverage and maximal-density export performance are not qualified. Chunk/recovery contracts are tested; Phase 01 real worker-death recovery remains a regression check.

Existing limits remain: video export ≤10 minutes / 200 clips / 1080p30. Translation, speech synthesis, simultaneous-source sync, templates, general AI editing, 4K parity, long renderer qualification and unrelated release hardening are deliberately deferred. Independent restoration of an older text deletion while retaining intervening edits is not implemented; shared Undo restores it exactly. Updating the cloud key requires restarting API and worker. User media under `.local/ediretor` is retained; test runs use isolated `artifacts` data.

## Exact commands

```powershell
npm.cmd run dev
# http://127.0.0.1:4317

npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run test:e2e:transcript
npm.cmd run test:e2e:transcript-states

# Built application, two separate terminals:
npm.cmd start
npm.cmd run worker
# http://127.0.0.1:4318
```

Keep the server key in ignored `.env.local` (`DEEPGRAM_API_KEY`); see `.env.example`. If Chromium is absent: `npx.cmd playwright install chromium`. The real workflow reads `EDIRETOR_SPEECH_FIXTURE` or the public fixture path in [provenance](phase-02/fixtures.md). The states script reuses the latest successful isolated transcript workflow; it adds test-only projects inside that artifact database.
## Manual-test follow-up

The user's observed transcription failure and requested tool/sidebar workspace were addressed after the original Phase 02 acceptance run. Diagnosis, the real two-chunk timestamp regression, recovered 346-word transcript, UI changes and current verification are recorded in [the 11 October follow-up](editor-tools-2026-10-11.md). This does not close the remaining formal Q01 review gate.


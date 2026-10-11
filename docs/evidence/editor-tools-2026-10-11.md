# Manual-test follow-up: transcription failure and tool workspace

User requested a fix for the observed failed transcription and a less crowded, flexible editor after manual testing. Work remains in the V2 workspace; no legacy modules, infrastructure, migrations, saved editing revisions or original media were replaced.

## Diagnosis and fix

Replaying the failed job's two durable provider checkpoints reproduced `TRANSCRIPT_INVALID` deterministically, without another provider request. Source duration: `161287696` µs. Last reported interval: `[160473625,162393623)` µs; the provider end exceeds the source by `1105927` µs. Schema shape, model metadata and within-chunk timestamp order were valid. The former 1s overrun bound rejected the complete transcript.

The regression test uses the actual boundary timestamps across two chunks. It first failed at the real adapter seam. The fix bounds a trailing-word repair to 2s, preserves its original end for review, clamps the normalized interval to the source end and computes ownership midpoint from that bounded interval. The midpoint change prevents a repaired last word from being silently excluded. Starts outside the source, reversed intervals and larger overruns still fail. New worker results use `dg-words-v2`; v1 records remain readable and immutable.

Repeatable read-only command:

```powershell
npx tsx scripts/replay-transcription.ts 856781cd-c1bd-4f4d-a171-5f22e29ac8bf
```

Actual result: PASS, two chunks, 346 words, one timing-adjusted word. The latest failed task for the user's video was explicitly retried through the UI and succeeded from its checkpoints. The resulting transcript is ready for the explicit **Use transcript** command. No paid re-upload was needed for recovery and no cuts or corrections were applied to the user's saved project during verification. The repair is not a claim that the provider's recognition or acoustic alignment is perfect.

## Design choices and implementation

Preserve the editor's existing identity: canvas `#f3eee4`, surface `#fbf8f2`, ink `#252321`, rules `#cec5b8`, editing accent `#a34d36`, and status `#536447`; retain the checked-in Arabic font and existing dark theme. The change spends its visual emphasis on the video monitor and selected tool instead of adding decorative UI.

One right-hand tool catalog/sidebar owns navigation for media, transcript, captions, properties and jobs. One drawer is open at a time. Close/reopen or switch tools without adding another fixed column. Desktop separators adjust drawer width and timeline height using pointer or keyboard, double-click restores defaults, and versioned browser preferences survive refresh. Narrow screens use an overlay drawer; the rail remains available. A size-container fitted monitor retains the 16:9 canvas under every tested height/width instead of constraining its height independently and stretching the picture.

Transcript paragraphs replace one-word full-width rows. Each bounded virtual paragraph preserves occurrence/utterance boundaries. Arabic paragraph order is explicitly RTL and English order is LTR; mixed word labels retain their own text direction. Search/review remain, with correction/cut controls appearing only for selected words. Empty/processing/failed states expose the relevant next action rather than disabled editing controls. Caption toggles and subtitle downloads moved to their own tool. Both subtitle download entry points reuse a helper that flushes Session edits before requesting the saved revision. The jobs tool correctly labels transcription separately from import.

Reuse/adapt: existing Kernel, Project Session, immutable transcripts, worker checkpoints, lease fencing, caption composition/renderer, preview, timeline, import/export dialogs and theme tokens. New modules are the tool catalog/navigation, separators, small tool panels and a saved-revision caption download helper. Persistent editing ownership stays in the existing Session/Kernel; drawer/layout/search/selection are UI state.

## Executed validation

- `npm test`: 153 tests passed in 13 files, including the real timestamp regression and existing ownership/history/migration/provider/caption tests.
- `npm run typecheck` and `npm run build`: passed.
- `npm run test:e2e:tools`: passed against the recovered real 346-word transcript. Browser-only attachment is explicitly injected for read-only review; API mutations are prohibited in that harness. Tool switching, closing, pointer/keyboard resizing, bounds, reset, preference persistence, search and selection passed. Ten screenshots cover 1920/1440/900/760/390px with both themes; page dimensions match the viewport, video ratio is 16:9, mounted words are 26–32, and the inspected visible word controls do not clip. No browser errors. Report: `artifacts/editor-tools-2026-10-11T06-49-32-137Z/report.json`.

The first simultaneous acceptance run and rebuild invalidated lazy module filenames while pages were open; it was a test/build race, recorded in `phase-01/02-2026-10-11T06-45-30-*` reports. Subsequent acceptance runs used a completed, fixed build:

- `npm run test:e2e`: passed, including actual import/split/delete/history, save recovery and revision conflicts, real pinned export, source markers/audio pulses, cancellation, missing/corrupt media, worker death/recovery and API restart. Report: `artifacts/phase-01-2026-10-11T06-49-31-814Z/report.json`.
- `npm run test:e2e:transcript`: passed with live Deepgram (107 source words, `dg-words-v2`), real correction/text cut/undo/redo/save/reload, SRT/VTT and a decoded 348-frame caption-burned export. No browser errors. Report: `artifacts/phase-02-2026-10-11T06-49-31-890Z/report.json`.
- `npm run test:e2e:transcript-states`: passed. The paragraph viewport mounted 42 words out of an explicitly synthetic 60,000-word corpus; search and far scrolling remained bounded. Real silent/no-speech and cancellation cases plus fault-injected unavailable/loading/failed states passed. Actual caption pixel parity remained `0.931966/255` luma difference; cue-boundary activation checks passed. Report: `artifacts/phase-02-states-2026-10-11T06-52-49-247Z/report.json`.

## Remaining limits

Full Q01 technical Arabic/English recognition accuracy and human review of natural cut boundaries remain open; this fixes a real 2m41s Arabic recording's failure without claiming the formal mixed-language gate passed. Existing 10-minute/200-clip/1080p30 export bounds and deferred long/4K qualification remain. This work does not introduce translation, new scene rendering, templates or AI tools.

## Follow-up: drag selection and floating actions

The next manual-test request replaces word checkboxes with press-and-drag selection. `use-word-selection.ts` owns transient pointer capture, logical occurrence-key ranges, edge auto-scroll and keyboard selection; it does not change transcript records or revisions. Word labels remain inline with selected-word highlighting. Single clicks retain seek. Selection works across virtual paragraph boundaries without requiring offscreen words to be mounted. Search/review filter changes clear selection to prevent an action on hidden matches.

`selection-toolbar.tsx` renders an extensible list of real action descriptors. The current commands delete selected words and open spelling correction for a single word, plus clear selection. The floating toolbar sits in a reserved action dock below the script, appears after releasing the pointer and never overlaps paragraphs. Correction opens on demand and receives focus; Escape clears the selection. Delete/Backspace do not intercept ordinary editing inside text inputs. All persistent actions reuse the existing Kernel, Session, autosave and shared Undo.

- `npm test`: all 153 tests in 13 files passed again.
- `npm run typecheck` and `npm run build`: passed with the new selection hook and toolbar.
- `npm run test:e2e:selection`: passed against an isolated copy of a completed real transcription fixture. Forward/reverse RTL drag selected the same three occurrence keys; selecting did not change the viewport height. Single-word correction focus, keyboard range extension, Escape and search scope passed. Actual drag-selected deletion saved through the API; Undo and reload restored the exact original clip intervals and retained immutable source words. An explicitly synthetic 60,000-word read-only response selected 53 words through auto-scroll, mounted only 30 after returning to the anchor, and retained the offscreen range. A stationary press at the bottom edge did not scroll or expand the selection; edge scrolling begins only after dragging. Screenshots at 1440/900/390px verified the toolbar is below the viewport, with no horizontal page overflow. No browser errors. Latest report: `artifacts/transcript-selection-2026-10-11T07-10-21-963Z/report.json`.
- `npm run test:e2e:tools`: passed with the new interaction, correction opened through its toolbar action, ten theme/viewport combinations remained bounded, and no browser errors. Report: `artifacts/editor-tools-2026-10-11T07-02-39-473Z/report.json`.
- `npm run test:e2e:transcript`: passed again with live Deepgram, 107 immutable source words, actual correction/cut/undo/redo/save/reload, corrected SRT/VTT and burned-in video export. No browser errors. Report: `artifacts/phase-02-2026-10-11T07-08-02-022Z/report.json`.

The selection harness copies only completed acceptance data and never edits the user's manual-test project. It covers UI selection and existing cut/history persistence; it does not close the remaining Phase 02 human recognition/naturalness gate or establish complete touch/assistive-technology qualification.

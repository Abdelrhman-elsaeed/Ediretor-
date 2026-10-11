# Phase 03 evidence

Status: implementation slice complete; formal Phase 03 acceptance is still open.

## Verification completed

- `npm.cmd run typecheck` — passed.
- `npm.cmd test` — passed: 14 files, 163 tests.
- `npm.cmd run build` — passed.
- `npm.cmd run test:e2e:multitrack` — executed against isolated API/worker fixtures. The latest completed artifact is [`report.json`](../../artifacts/phase-03-2026-10-11T10-28-22-092Z/report.json). The run reached the real-media checks and recorded the results below, then stopped on a transcript-history assertion before the full suite completed.

## Recorded results

The completed portion covers manual positive and negative offsets, marker alignment and drift refusal, synchronized preview and primary audio, PiP/fullscreen layout, crop and placement, supporting-image trim/move/duplicate, fades, gain and ducking, combined-source import, audio-only and silent-output decoding, save/reopen/API restart, and Q07 VFR/29.97 input.

The decoded Q02 marker errors were approximately 0.042 ms at 3 s, 6 s, and 10 s. Q04 audio and silent-output RMS checks passed. Q07 decoded markers also measured approximately 0.042 ms. The parity samples measured luma differences of 7.3658 and 7.0; the harness records these values and uses a tolerance of 12 for the current implementation.

Fixtures are FFmpeg lavfi-generated media, with the completed Phase 02 transcript fixture copied into the isolated run. No provider mocks or private media were used.

## Open acceptance work

The long end-to-end run must be repeated after the transcript-history assertion is corrected. Human visual review for Q01 and long-duration renderer qualification remain open. Phase task checkboxes therefore remain intentionally unchecked.

For a manual review, start the app with `npm.cmd run dev` and open `http://127.0.0.1:4317`.

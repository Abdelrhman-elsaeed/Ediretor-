# Phase 00 follow-up — 2026-10-11

Status: **NO-GO for renderer qualification; benchmark round stopped and outstanding qualification deferred by the user on 2026-10-11.** Frontend implementation is authorized without passing this gate or producing a Figma artifact. This follow-up preserves the earlier reports and media. Short A CFR/container validation passes; B's opaque graphics-cache defect is fixed and short parity passes. Long workloads remain subject to censored deadlines; no long-video support claim follows from these samples. Remaining gates below are historical outstanding quality work, not prerequisites for beginning the frontend.

## Reused and changed

Reused the existing snapshots, pure time/cut modules, Remotion composition, native FFmpeg segment/mux pipeline, preview, validator, and sampled Windows process-tree monitor. No legacy files or production frontend changed. B now resolves `graphicsOnly` props with `selectComposition` before `renderMedia`; graphics cache version 2 prevents reuse of historical opaque scenes. `graphics-alpha.ts` rejects a cache entry whose unpainted corner is opaque or whose decoded frame count differs. The benchmark accepts candidate/fixture filters to avoid repeating completed A attempts.

## Reproduction and regression

The historical cache contains full-frame video, despite having a ProRes alpha-capable pixel format. Visual comparison at frame 329 shows that cached video covering the intended inset. The installed Remotion 4.0.518 renderer serializes `composition.props` as effective props; changing `inputProps` at `renderMedia` alone was insufficient. See [Remotion v4 props semantics](https://www.remotion.dev/docs/4-0-migration).

```powershell
# RED: exits 1 with GRAPHICS_ALPHA_INVALID (historical opaque cache)
node --import tsx experiments/render-feasibility/scripts/validate-graphics.ts .cache/feasibility/21f6e6b2b2b4f56778c852116ffc3887b29c5f09f9f954a80ac92498d6a571c0.mov 60
# GREEN: 60 decoded frames, transparentCornerPass=true
node --import tsx experiments/render-feasibility/scripts/validate-graphics.ts .cache/feasibility/081b4428933f67b3b02745e30977190d224df73b394527d55e48ab50cb9f8e63.mov 60
npm.cmd run typecheck
npm.cmd test
npm.cmd run render -- real B cold 600
npm.cmd run validate -- artifacts/real-B-cold-2026-10-11T04-21-54-888Z
```

Typecheck passed and **105 tests / 6 files passed**. Media regression uses the actual cache/render boundary rather than a mocked props assertion. The corner check is specific to this template and does not replace full parity checks.

Two earlier seek experiments did not fix the defect and were reverted: [cold report](real-B-cold-2026-10-11T04-12-54-438Z.json), [cold validation](real-B-cold-2026-10-11T04-12-54-438Z-validation.json), [warm report](real-B-warm-2026-10-11T04-16-08-373Z.json), [warm validation](real-B-warm-2026-10-11T04-16-08-373Z-validation.json). Their build hashes describe experimental code, not the final fix. Moving `-ss` among multiple inputs also changes which input/output it applies to; these attempts do not establish an FFmpeg accurate-seek defect.

## A final CFR/container validation

```powershell
npm.cmd run preview
npm.cmd run validate -- artifacts/real-A-cold-2026-10-10T14-50-17-338Z
ffprobe -v error -show_streams -show_format -of json artifacts/real-A-cold-2026-10-10T14-50-17-338Z/output.mp4
```

Existing output revalidated without rerendering: 12.000000s, 30/1 average frame rate, 360 frames, full decode, maximum timestamp error 0.33µs, 12/12 visual samples, zero-millisecond marker offsets. [Validation](real-A-cold-2026-10-10T14-50-17-338Z-validation.json). Probe also reports full-range `yuvj420p` for this A artifact, while the requested profile says `yuv420p`; color-range/encoder-build equivalence is not claimed.

## B fixed short sample

[Render](real-B-cold-2026-10-11T04-21-54-888Z.json) / [validation](real-B-cold-2026-10-11T04-21-54-888Z-validation.json): 31.872s wall for 12s output, RTF 2.656, peak tree working set 1,578,127,360 bytes and run disk 20,245,620 bytes. All 12 samples match the requested frame; frame 329 MAE 1.964 / PSNR 38.480. Metadata, decode, timestamps, and three audio windows pass. Historical frame 329 MAE was 26.367 / PSNR 14.825.

## Workload commands and measurement limits

```powershell
# Original A matrix: all six attempts reached deadline; results retained in phase-00.md.
powershell.exe -NoProfile -File experiments/render-feasibility/scripts/benchmark.ps1 -DeadlineSeconds 120
# Continue only B after the graphics fix.
powershell.exe -NoProfile -File experiments/render-feasibility/scripts/benchmark.ps1 -Candidates B -DeadlineSeconds 120
```

The original matrix was interrupted during `Q05-B-cold-2026-10-11T04-04-20-259Z`, leaving partial artifacts without a completed report. It is **aborted/unscored**, not evidence of cancellation correctness. The later B matrix uses new run IDs.

All attempts receive complete snapshots: Q05 108000 frames; Q06 432000; Q10 360 frames at 3840×2160. A 120s limit is a bounded diagnostic sample, not the Q05 RTF≤2 acceptance window. `completedRtf=null` on timeout; elapsed/requested-duration is not a completed performance result. Do not extrapolate memory or throughput to the full sequence.

Metrics sample tree working set/run disk/shared cache about every two seconds, may miss spikes, and do not measure total system memory or OS caches. Old cache entries are retained, so shared-cache totals include historical artifacts. The host had roughly 49.8GiB free on D at the initial follow-up check, versus 50.18GiB in the earlier environment JSON (the old narrative incorrectly said 15.3GiB). No historical environment record was overwritten.

The first B/Q05 cold sample overlapped a short unit-test run and small diagnostic frame/alpha checks; later samples ran without those checks. Host background activity and OS caches were uncontrolled. These are feasibility observations, not a statistically controlled speedup comparison. Short A and fixed B also come from different runs and should not be used as a precise paired speedup ratio.

## B workload results after the fix

| Run/report | wall s | completed RTF | peak tree GiB | peak run MiB | progress/result |
|---|---:|---:|---:|---:|---|
| [Q05 cold](Q05-B-cold-2026-10-11T04-23-03-088Z.json) | 120.291 | null | 1.099 | 164.42 | 4743/108000 frames; deadline |
| [Q05 warm](Q05-B-warm-2026-10-11T04-25-03-863Z.json) | 120.387 | null | 0.847 | 166.63 | 4959/108000 frames; deadline |
| [Q06 cold](Q06-B-cold-2026-10-11T04-27-05-514Z.json) | 120.402 | null | 1.483 | 120.79 | 3360/432000 frames; deadline |
| [Q06 warm](Q06-B-warm-2026-10-11T04-29-06-573Z.json) | 120.354 | null | 0.666 | 164.46 | 4800/432000 frames; deadline |
| [Q10 cold](Q10-B-cold-2026-10-11T04-31-07-591Z.json) | 106.426 | 8.869 | 3.125 | 49.07 | 360 frames rendered; parity failed |
| [Q10 warm](Q10-B-warm-2026-10-11T04-32-54-599Z.json) | 51.360 | 4.280 | 2.213 | 45.87 | 360 frames rendered; parity failed |

All six B workload reports have buildHash `0840b088e72fab8a172a3d81dc4db6e39ef0add6b838ff7ea873c1c5f5514ccc`. Rendering completion is distinct from validation. Q10 cold [validation](Q10-B-cold-2026-10-11T04-31-07-591Z-validation.json) passes metadata, all 360 decoded frames, timestamps and audio, but fails all 12 visual samples (MAE 6.17–9.37; PSNR 24.14–26.33). This is a separate 4K/synthetic-source parity limitation, not evidence that the short real/1080p graphics fix failed. Color/scaling differences need investigation; the cause is not established.

The warm [validation](Q10-B-warm-2026-10-11T04-32-54-599Z-validation.json) produced the same visual error measurements and also failed all 12 samples; metadata, timing, full decode and audio still passed.

```powershell
npm.cmd run validate -- artifacts/Q10-B-cold-2026-10-11T04-31-07-591Z
npm.cmd run validate -- artifacts/Q10-B-warm-2026-10-11T04-32-54-599Z
```

## Remaining gates

- Full Q05/Q06 completion, output validation and support limits; long streaming validation remains unimplemented.
- Q10 is an upscaled synthetic 1080p source, not native 4K decode or a dense Arabic scene acceptance fixture.
- Manual Arabic visual review and the broader quality fixtures remain separate from automated parity.
- A spot visual check of corrected B frame 329 confirmed inset placement and readable Arabic/Latin overlay; this does not constitute the full Arabic content/accessibility review.
- B is limited to the current non-overlapping graphic fixtures. The permissive schema accepts overlaps, but B's per-graphic cache key and first-active-graphic selection do not correctly model overlapping scenes. Reject or implement overlap semantics before broadening the harness; do not infer multi-layer graphics support from these results.
- Renderer/production stack/runtime/queue decisions remain pending; do not mark Phase 00 or Phase 01 complete.
- Phase 00D's [handoff draft](../design/phase-00d-handoff.md) maps contracts but awaits a Figma artifact and actual accessibility/prototype review.

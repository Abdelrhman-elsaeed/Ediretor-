# Phase 02 fixture provenance

Actual Arabic speech: Wikitongues, **Anonymous speaking Egyptian Arabic**, described at [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Anonymous_20200622_arz.ogg). Author: Wikitongues. License: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Source page links the original [QuickTime recording](https://www.dropbox.com/s/m02gbcoxfb1e39q/Anonymous_20200622_arz.mov?dl=1). The Wikimedia download returned HTTP 429; the original public source was successfully downloaded instead. No private legacy media were copied.

Original: 47.088345s, 1280×720, H.264/AAC, nominal 2997/125 fps, SHA-256 `392f32bfd4f15f96343d85cd1a95487c99b24b712439215af9a72f4f21046ca0`. Stored locally at `artifacts/phase-02-fixtures/egyptian.mov`. Reproduce download:

```powershell
New-Item -ItemType Directory -Path artifacts/phase-02-fixtures -Force | Out-Null
curl.exe -L --fail --max-time 60 'https://www.dropbox.com/s/m02gbcoxfb1e39q/Anonymous_20200622_arz.mov?dl=1' -o artifacts/phase-02-fixtures/egyptian.mov
```

The application generates a CFR 1080p preview, transcribes the actual entire source, and limits the edited export check to its first 12s before a word deletion. Retained test outputs/screenshots show an edited/trimmed copy and added captions; source bytes are unchanged. Copies/adaptations of this recording remain under CC BY-SA 4.0 with attribution to Wikitongues and the source/license links above. The screenshot's “TypeScript” correction intentionally tests mixed-script captions; it is not evidence that the speaker said that word or that Arabic/English code switching accuracy passed.

Other fixtures: native-generated 1s silent video, 2s video with a real silent audio stream, and explicit synthetic 60k-word corpus for DOM/search stress. The stress corpus is injected only into a read-only browser response under a clearly synthetic title. Provider success in the real workflow and silent-audio check is never mocked. Provider timeout/unavailable UI and retry/overlap/cancel failure contracts use clearly recorded fault injection.

This short Egyptian sample substitutes for part of Q01; it does not establish a 2–5min technical Arabic/English accuracy/WER/timing review. Long-render Q05/Q06 qualification remains deferred. The 60k-word UI check is a textual stress check, not a long video renderer benchmark.

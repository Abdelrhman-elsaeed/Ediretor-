# Phase 02 targeted UI review

Reviewed against the current [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), fetched 2026-10-11, and the installed React performance/design skills. The established warm palette/type/RTL layout is retained; the transcript occupies the editor's existing side-panel space, with deliberate LTR timing and plain Arabic actions. Desktop is bounded; tablet/phone stack the panel without hiding the workflow.

`apps/web/src/features/transcript/transcript-panel.tsx` — fixed an initially unconstrained scroll height that mounted the entire corpus. Final real-browser stress: 12 mounted rows / 60k words, deferred search, distant scrolling. Controls are labelled, real buttons/checkboxes, have visible focus, and preserve selection when a conservative cut is rejected. Source and occurrence identity stay distinct.

`apps/web/src/features/transcript/caption-preview.tsx` — reviewed: playback uses a direct subscription, binary cue search and redraws only on transitions. The editor/session tree is not updated every frame. Caption errors are visible; actual raster shaping/placement is checked against export.

`apps/web/src/features/editor/editor.tsx` and `export-dialog.tsx` — reviewed: existing history/recovery and keyboard paths are reused; text panel is lazy; subtitle download flushes before pinning revision; stale/error states are retained. The added workflow does not create competing persistent React state.

`apps/web/src/styles.css` — reviewed in Chromium at 1440/900/390px in both themes with reduced motion. RTL chrome and LTR timeline/timecodes remain; no horizontal document overflow. Select backgrounds/text follow the theme. The actual caption Canvas stays within the video geometry and shares local font bytes with the worker.

Limits: targeted review, not a full screen-reader, tab-order or hybrid-touch audit; transcript rows are virtual and many source catalogs are not yet paged. Panel/search UI state is session-local, not deep-linked in the URL. Captions use font-display block deliberately to prevent measuring/drawing a substituted font; missing font/runtime is an explicit error. No screenshot is evidence of recognition accuracy.

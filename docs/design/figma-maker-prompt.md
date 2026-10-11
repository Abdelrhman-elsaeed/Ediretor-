# Figma Maker Prompt — Ediretor V2 Design Foundation

**Active direction, 2026-10-11:** Figma is cancelled by the user. Use the prompt below only as the visual/product brief for the actual React application. Do not invoke Figma or require an artifact. Future concept screens remain scoped to their recorded phases. The original prompt is preserved below for reference.

The contract-oriented handoff draft is in [phase-00d-handoff.md](phase-00d-handoff.md). Use it to annotate Figma frames; it does not claim that a Figma artifact has been created or accepted.

Copy the prompt below into Figma Make. Treat it as a product and interaction brief, not as permission to invent backend behavior.

```text
Design and prototype the new Ediretor V2 video-editing platform from scratch. This is a serious desktop-first editor for long Arabic educational videos, screen recordings, camera footage, graphics, captions, and future AI-assisted editing.

Do not copy, imitate, or visually refresh the old TextCut editor. Use a new information architecture and a new visual language. The old product is only a research reference for problems to avoid.

PRODUCT MODEL

The product edits a versioned ProjectDocument. The user imports one or more media assets, reviews them, edits a non-destructive timeline, saves revisions, previews the result, and exports a selected revision. Camera, screen recording, audio, captions, graphics, layouts, and scenes are parts of one project snapshot. The interface must make revision, save state, preview state, and export state understandable.

Scope each flow by delivery phase. Phase 01 implements import, basic manual cuts, save/reopen, undo/redo, conflict recovery, preview, and durable export. Transcript/captions are Phase 02, expanded tracks/sync/layout are Phase 03, templates/scenes are Phase 04, and AI workflows are Phase 05–06. Their presence in this prototype does not add them to Phase 01. Offline library, archive, and runtime preference behavior are design proposals until their application contracts are defined.

Production ProjectDocument and application APIs remain proposed contracts. The existing Phase 00 code is a render experiment plus pure time/cut functions. Annotate queries as semantic read needs rather than inventing API names. Use documented proposed editing commands such as InsertClip, SplitClip, TrimClip, RippleDeleteRange, CorrectWordText, and SetCaptionStyle; CommandEnvelope uses commandId and baseRevisionId. Distinguish editing commands from create/import/job application effects and from UI-only selection or focus.

PRIMARY USERS

Arabic-speaking educators and technical creators who record long lessons with camera and screen content. The product is Arabic-first but must handle Arabic and English in the same sentence, code, filenames, timestamps, numbers, and technical terms.

VISUAL DIRECTION

Create a warm editorial production tool: calm, precise, tactile, and professional. It should feel closer to a well-designed film-editing desk and a technical notebook than to a generic SaaS dashboard.

Use generous warm neutrals, strong typographic hierarchy, thin structural rules, compact panels, restrained shadows, and clear grouping. Use color as semantic emphasis and status, never as decoration everywhere.

Do not use:
- default AI gradients;
- blue or purple primary branding;
- neon cyan, electric violet, hot pink, or rainbow accents;
- glassmorphism, excessive blur, floating blobs, or glossy cards;
- generic startup illustrations;
- excessive rounded pills;
- dense black-on-black panels with unreadable text.

COLOR SYSTEM

Use these values as the starting design tokens. Keep them semantic and reusable through Figma variables. Do not invent additional accent colors without a documented role.

Light surfaces:
- canvas: #F3EEE4 — warm paper workspace
- surface: #FBF8F2 — cards and panels
- surface-raised: #FFFFFF — menus and focused sheets
- surface-muted: #E6DED1 — secondary regions
- ink: #252321 — primary text
- ink-muted: #6B655D — secondary text
- rule: #CEC5B8 — borders and separators

Dark editor surfaces:
- canvas-dark: #171716
- surface-dark: #22211F
- surface-raised-dark: #2B2926
- ink-on-dark: #F4EFE5
- ink-muted-dark: #B8B0A4
- rule-dark: #48433D

Semantic accents:
- copper: #B85E47 — primary action, selected playhead, active editing intent
- ochre: #C49243 — attention, processing, pending work
- moss: #6F7D61 — success, saved state, accepted revision
- eucalyptus: #789184 — secondary positive state and media availability
- ember: #A84F43 — destructive action and failed state
- focus: #D7A45C — keyboard focus ring

Keep text contrast accessible. Never use copper, ochre, moss, or eucalyptus for long paragraphs. Never use color alone to communicate status; pair it with labels and icons.

TYPOGRAPHY

Use an Arabic-capable sans family with a technical companion:
- Arabic and interface: IBM Plex Sans Arabic or Noto Sans Arabic
- Latin interface: IBM Plex Sans
- code, IDs, timecodes, frame counts: IBM Plex Mono

Use clear Arabic line height and avoid forced justification. Support explicit direction per text run: RTL for Arabic prose, LTR for English terms, code, IDs, and timecodes. Demonstrate mixed examples such as: "قصّ جزء React من الثانية 00:12 إلى 00:18" and "TypeScript + FFmpeg".

LAYOUT

Desktop first at 1440×1024 and 1920×1080. Provide a usable 1280px layout and a tablet adaptation. Do not design a separate mobile editor. Use a 4px base spacing scale, 8px common spacing, 12px panel radius, 1px rules, and subtle elevation only for overlays and menus.

INFORMATION ARCHITECTURE AND SCREENS

Create these pages and connect them in a clickable prototype:

1. Workspace / project library
- recent projects, search, sort, filters, last revision, processing status, duration, media count;
- create project and import project actions;
- empty, loading, offline, failed-to-load, and archived states.

2. New project and import flow
- drag-and-drop media import;
- source cards showing video/audio streams, duration, resolution, frame rate, audio availability, and processing progress;
- support one combined file, separate camera/screen sources, and a silent visual asset;
- clear unsupported/corrupt/missing-audio states;
- continue working while proxy generation is in progress.

3. Main editor shell
- top bar: project name, revision badge, saved/unsaved/conflict state, undo/redo, preview, export;
- left rail: project media, transcript, graphics/scenes, templates, settings;
- center: large preview with timecode, playhead, safe-area overlay, zoom, fit, and reduced-motion option;
- bottom: multi-track timeline with video, screen, audio, captions, graphics, and layout tracks;
- right inspector: selected clip/scene/caption/layout properties with source time and sequence time clearly separated;
- keep selection/playhead/progress visually distinct from persistent editing state.

4. Transcript and caption editing
- Arabic-first transcript rows with word timing, confidence marker, speaker marker, and English mixed text;
- correcting text changes display text only;
- deleting a word or range proposes a non-destructive cut with visible boundaries;
- show review-needed anchors and a clear undo action;
- never make the transcript look like a separate competing project state.

5. Graphics and scene editing
- scene cards for title, comparison, steps, diagram, screenshot callout, and code highlight;
- inspector for text, color roles, timing, cue, asset, and layout;
- show locked/manual-approved items and explain why AI cannot replace them;
- no arbitrary code editor in this foundation prototype.

6. Save, revision, and export
- revision history panel with current revision, parent revision, author, time, and export links;
- explicit unsaved state and recoverable pending changes;
- conflict dialog for stale baseRevisionId with proposed compare/reload recovery that preserves pending work; replan belongs to later AI proposals;
- export profile sheet with resolution, frame rate, audio, captions, and selected revision;
- durable job status: queued, preparing, rendering, validating, publishing, completed, failed, cancelled, retrying;
- show export failure reason and safe retry without implying that a partial file is valid.

7. Settings and local runtime
- fonts, language/direction, appearance, proxy quality, reduced motion, and local storage health;
- keep secrets and provider keys out of the UI.

COMPONENT LIBRARY

Create reusable Figma components and variants for:
- buttons, icon buttons, menus, tabs, segmented controls, inputs, comboboxes, sliders, checkboxes, toggles;
- media cards, clip cards, transcript rows, timeline clips, track headers, inspector sections;
- badges for saved, unsaved, processing, conflict, failed, cancelled, locked;
- toast, inline error, modal, drawer, command bar, progress, skeleton, empty state;
- playhead, timecode, ruler, waveform placeholder, caption cue, scene cue;
- focus, hover, pressed, disabled, selected, loading, error, and keyboard states.

INTERACTION RULES

- Use real labels and meaningful sample content, not lorem ipsum.
- Make the prototype demonstrate import → processing → editor → edit → save → revision → export.
- Demonstrate undo/redo, unsaved changes, stale revision conflict, failed export, retry, missing asset, and missing audio.
- Keep destructive actions explicit and reversible where possible.
- Use labels and icons in addition to color.
- Respect reduced motion and avoid unnecessary looping animation.
- Use Arabic RTL layout for Arabic content, but preserve LTR islands for code, English words, IDs, and timecodes.
- Record timeline direction and seek-key behavior as an open design decision; an LTR time axis inside the RTL shell is a proposal to review, not an accepted production rule. Never mirror video content when changing interface language.

HANDOFF REQUIREMENTS

Create a Handoff page containing:
- color, typography, spacing, radius, elevation, and motion variables;
- component inventory and variants;
- page map and prototype flow map;
- responsive behavior at 1280, 1440, and 1920 widths;
- accessibility notes and contrast checks;
- annotations for which UI state maps to ProjectDocument, revision, command, query, preview, or export job;
- delivery-phase and contract-maturity labels: implemented experiment, proposed production contract, or future capability;
- open questions that must be answered before React implementation.

Do not generate backend code, database schemas, API keys, AI prompts, or production claims. Produce a coherent, implementable V2 foundation with a strong visual identity and no generic blue/purple AI aesthetic.
```

## After Figma Maker finishes

1. Rename the file and create the pages listed above.
2. Replace any invented colors, generic cards, or missing error states before accepting the result.
3. Test the prototype flow: import → processing → editor → edit → save → revision → export → failure/retry.
4. Confirm Arabic/English direction, timecodes, code, keyboard focus, contrast, and responsive behavior.
5. Export or record the final tokens, component inventory, screen map, and open questions.
6. Bring the Figma link/export into `docs/design/` and use it as the handoff input for Phase 01. Do not start copying the old editor component.

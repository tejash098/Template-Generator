# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Hindi letter generator for **Shri Ram Bus Service** (one bus operator in Bhabhua, Bihar). Staff fill a form, the text is laid onto the operator's fixed printed letterhead, and the result is previewed, exported (PDF / PNG / JPG), printed, shared, and auto-saved locally. It is a React SPA that will later be wrapped for mobile (Capacitor) and desktop (Electron) and gain optional Supabase sync.

Product and architecture decisions were settled in an interview with the owner before any code existed and are **binding**. Do not deviate silently; if a change conflicts with them, raise it. The list:

- One operator, one fixed letterhead design (recreated in HTML/SVG from a photo — no source artwork). Only the letter content changes.
- Body is free text typed like a letter. **The real form fields and the form→letter mapping are still to be supplied by the owner** — the current fields (recipient, subject, body, closing, signatory, designation) are provisional.
- Always one page: body text shrinks to fit, with a visible warning when shrunk below 80%.
- पत्रांक (letter number) is auto-assigned, sequential, zero-padded, never reused. A prefix slot exists for per-device collision avoidance once sync arrives.
- Date displays as `dd/mm/yyyy` with Western digits. Body font: Tiro Devanagari Hindi (serif).
- Paper is user-selectable: Letter (default), Legal, A0–A5, custom mm; portrait or landscape. The letterhead scales with the page.
- Typed closing + blank space for a pen signature. No signature images.
- Local-first: fully usable offline with no account. Store **form data only**; documents are regenerated on demand, never stored as files.
- Printing is on blank paper (the app prints the letterhead too).
- Hindi input via built-in Roman→Devanagari transliteration: online provider first, offline rules as fallback.
- PDF: vector via the platform print engine where possible (Electron / native mobile, milestone 2); on the plain website an image-based PDF downloads and "Print → Save as PDF" gives a vector one.
- Delivery order: 1) web app end-to-end (done, provisional form) → 2) Capacitor + Electron shells → 3) Supabase auth (per-staff logins), sync, share links.

## Commands

```bash
npm run dev          # Vite dev server (http://localhost:5173)
npm run build        # tsc -b && vite build → dist/
npm run preview      # serve dist/
npm run typecheck    # tsc -b only
npm run lint         # eslint .
npm test             # vitest run (all)
npx vitest run src/transliteration/offlineRules.test.ts   # one file
npx vitest run -t "sequential"                             # tests matching a name
npm run test:watch
```

Node 25 prints `EBADENGINE` warnings from vite/vitest (they list 22/24/26); they are harmless. TypeScript is pinned to 5.9 on purpose. `.claude/launch.json` defines a `web` dev-server config for the in-app browser preview.

Tests run under jsdom with `fake-indexeddb` (see `src/test/setup.ts`), so the Dexie repository is tested against a real IndexedDB implementation. Layout-dependent code (fit-to-page, capture) is verified in the browser, not in unit tests.

## Architecture

```
src/
  document/        The page itself — platform-neutral, no app state
  export/          Turning the rendered page into files (platform interface + web impl)
  storage/         Dexie (IndexedDB) schema and the letters repository
  transliteration/ Roman → Devanagari input (online + offline) and the input component
  features/editor  Form + live preview + export bar (routes /new, /letters/:id)
  features/letters List, search, duplicate, delete (route /)
  components/      App shell
  styles/app.css   Global UI styles and the print stylesheet
```

### The sheet is the single source of truth

`document/LetterSheet.tsx` renders one finished page: `LetterheadHeader` + content + `LetterheadFooter`, sized in CSS **millimetres** to the chosen paper (`document/pageSizes.ts`). Preview, print, PNG/JPG capture and PDF all render this same element — there is no separate document model or template engine.

Invariants that everything else relies on:

- `.sheet` must never carry a CSS `transform`. `features/editor/SheetPreview.tsx` scales a wrapper (`.preview-transform`) instead, so exporters capture the sheet at 1:1 via `sheetRef`.
- Every dimension in `document/sheet.css` derives from `--u` = 1/100 of the page's **shorter** side. That is what makes the letterhead keep its proportions on A5, A0 and landscape alike. Add new sheet styles the same way; never use px.
- Fit-to-one-page lives in `document/useFitText.ts`: it binary-searches `--body-scale` on `.lh-content` until `.lh-body` stops overflowing, and refits after `document.fonts.ready`. It measures with `scrollHeight`/`clientHeight`, which ignore transforms. The sheet must remain laid out (never `display: none`) for this and for export — the phone layout parks the hidden pane off-screen for that reason.
- Fixed letterhead text lives only in `document/letterheadContent.ts`. Fonts are bundled via `@fontsource/*` imports in `main.tsx` (never fetched from Google Fonts) so output is identical offline and inside the shells.

### Export pipeline

`export/exporter.ts` defines `DocumentExporter` (`toImage`, `toPdf`, `print`, `share`, `download`, `pdfKind`). `export/index.ts#getExporter()` picks the implementation; today only `webExporter.ts` exists. Electron/Capacitor exporters belong there too, so feature code never branches on platform.

The web exporter captures the DOM with `html-to-image` (lazy-loaded) — the browser does the Devanagari shaping, which jsPDF/pdfmake/react-pdf cannot. `pixelRatioFor` targets 300 dpi but caps total pixels at 24 MP so A0–A2 do not exhaust memory on phones. The PDF is that PNG placed on a page of the exact size in points via `pdf-lib` (lazy-loaded). Printing injects an `@page { size }` rule for the current paper and relies on the `@media print` rules at the bottom of `styles/app.css`, which hide everything except the sheet.

### Storage

`storage/db.ts` — Dexie database `srbs-letters`: `letters` (indexed `id, seq, date, updatedAt`) and `meta` (`nextSeq`, `letterNoPrefix`). `LetterRecord` is flat JSON on purpose so it can mirror to Supabase later.

`storage/letters.ts` — the repository (`create`, `get`, `update`, `list(query)`, `duplicate`, `remove`). `create` allocates the sequence inside a read-write transaction over `letters` + `meta`. Search is a client-side substring filter, fine for one operator's volume. `lettersRepo(db)` takes an injectable db for tests.

The editor (`features/editor/LetterEditor.tsx`) only creates the record on the **first edit**, so opening `/new` and leaving never burns a पत्रांक; it then `navigate`s to `/letters/:id` with `replace`. Autosave is debounced 400 ms and flushed on unmount. `useLiveQuery` (dexie-react-hooks) keeps the list live.

### Transliteration

`transliteration/TransliterateInput.tsx` is a controlled input/textarea that converts the Roman word before the caret on Space/Enter/punctuation (Google Input Tools UX). `currentWord.ts` decides what counts as a word: tokens with digits (`BR24P8555`) or in ALL CAPS (`AM`, `RTA`) are left alone.

Two providers: `googleInputTools.ts` (unofficial but CORS-enabled dictionary API) and `offlineRules.ts` (rule-based Hinglish engine with Hindi spelling heuristics; deliberately imperfect, only the fallback). Latency strategy: commits never wait on the network — the offline result is inserted instantly and **upgraded in place** when the online spelling arrives, provided the committed text is still untouched. Suggestion lookups are abortable; upgrade lookups are not. All programmatic value changes go through a value-guarded caret restore, and upgrades are applied with `flushSync` so a keystroke can never interleave with a half-applied edit. Network failure switches to offline-only for 30 s. The global on/off switch is `useTransliterationPref` (localStorage).

### Routing

`HashRouter`, because the same `dist/` will be loaded from `file://` inside Electron and Capacitor. `vite.config.ts` sets `base: './'` for the same reason.

## Conventions

- No semicolons, single quotes, 2-space indent (matches the Vite template). ESLint runs the React Compiler-era `react-hooks` rules: no ref writes during render, no `setState` directly in effects (adjust state during render instead), no mutation of ref-held objects — rebuild arrays/objects instead.
- UI labels are English with the Hindi letterhead terms where they map to the page (पत्रांक, दिनांक, विषय, सेवा में). This is provisional; the owner has not chosen a UI language.
- Keep `document/` free of app state, router and storage imports so it can be reused by the shells unchanged.

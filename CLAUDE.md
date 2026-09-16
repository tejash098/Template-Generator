# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A document generator for **Shri Ram Bus Service** (one bus operator in Bhabhua, Bihar). Staff pick a template, choose the pad colour, fill a form, and the data is laid onto the operator's fixed printed letterhead as the Hindi prose the operator writes by hand; the result is previewed, exported (PDF / PNG / JPG), printed, shared, and auto-saved locally. It is a React SPA that will later be wrapped for mobile (Capacitor) and desktop (Electron) and gain optional Supabase sync.

The only template today is the **बरात (baraat) bus-booking receipt**. Product and architecture decisions were settled in interviews with the owner and are **binding**. Do not deviate silently; if a change conflicts with them, raise it. The list:

- One operator, one fixed letterhead design (recreated in HTML/SVG from photos — no source artwork). The pad ink colour is selectable (navy default, orange, green, maroon, black) and recolours the whole letterhead.
- Home page is a **template gallery** (registry in `src/templates/`), then a **pad-colour step**, then the form. More templates are expected later.
- The booking is written as **prose like the handwritten samples**, always in Hindi. Fields: name, place, from, to, travel date, departure time (+ optional return time), total fare, advance received, balance (derived), mobile, optional bus/vehicle line, booking date (top दिनांक), auto पत्रांक. Bottom of the page: customer signature space + "जारी दिनांक" (generated-on date, from `createdAt`).
- Always one page: text shrinks to fit, with a visible warning below 80%.
- पत्रांक is auto-assigned, sequential, zero-padded, never reused. A prefix slot exists for per-device collision avoidance once sync arrives.
- Dates display as `dd/mm/yyyy` with Western digits; amounts as `15000/-` plus Hindi words. Body font: Tiro Devanagari Hindi.
- Paper is user-selectable: Letter (default), Legal, A0–A5, custom mm; portrait or landscape. The letterhead scales with the page.
- Local-first: fully usable offline with no account. Store **form data only**; documents are regenerated on demand, never stored as files.
- Printing is on blank paper (the app prints the letterhead too).
- UI: Tailwind v4 styled to match the owner's `project-dashboard` repo (same tokens, warm cream / near-black palette, sidebar shell). **Light/dark** toggle and **Hindi/English** toggle for UI labels only — the document is never localised.
- Hindi input via built-in Roman→Devanagari transliteration: online provider first, offline rules as fallback.
- PDF: vector via the platform print engine where possible (Electron / native mobile, milestone 2); on the plain website an image-based PDF downloads and "Print → Save as PDF" gives a vector one.
- Delivery order: 1) web app end-to-end (done) → 2) Capacitor + Electron shells → 3) Supabase auth (per-staff logins), sync, share links.

## Commands

```bash
npm run dev          # Vite dev server (http://localhost:5173)
npm run build        # tsc -b && vite build → dist/
npm run preview      # serve dist/
npm run typecheck    # tsc -b only
npm run lint         # eslint .
npm test             # vitest run (all)
npx vitest run src/document/bookingText.test.ts   # one file
npx vitest run -t "sequential"                     # tests matching a name
npm run test:watch
```

Node 25 prints `EBADENGINE` warnings from vite/vitest (they list 22/24/26); they are harmless. TypeScript is pinned to 5.9 on purpose. `.claude/launch.json` defines a `web` dev-server config for the in-app browser preview.

Tests run under jsdom with `fake-indexeddb` (see `src/test/setup.ts`), so the Dexie repository and the v1→v2 migration are tested against a real IndexedDB implementation. Provider tests use Testing Library's `renderHook`. Layout-dependent code (fit-to-page, capture) is verified in the browser, not in unit tests.

## Architecture

```
src/
  document/        The page itself — platform-neutral, no app/router/storage/i18n imports
  templates/       Registry of document types (ids.ts is import-cycle-safe for storage)
  export/          Turning the rendered page into files (platform interface + web impl)
  storage/         Dexie (IndexedDB) schema, migration, bookings repository
  transliteration/ Roman → Devanagari input (online + offline) and the input component
  i18n/            UI strings (en/hi), LocaleProvider, translate()
  theme/           ThemeProvider (.dark on <html>)
  layout/          SidebarProvider
  layouts/         AppShell (sidebar + drawer), PageLayout
  components/ui    Button, Card, Modal, ConfirmDialog, Field, SegmentedControl, PadColorSwatches, toggles
  components/nav   Sidebar, NavItem
  config/          constants.ts (shared Tailwind class strings), navItems.ts
  features/templates  Gallery (/) and pad-colour start page (/templates/:id)
  features/editor     BookingEditor (/new, /bookings/:id), BookingForm, PaperAndPadSetup, ExportBar, SheetPreview
  features/bookings   BookingsList (/bookings)
  index.css        Tailwind entry; styles/tokens.css (design tokens); styles/print.css (print rules)
```

### The sheet is the single source of truth

`document/BookingSheet.tsx` renders one finished page: `LetterheadHeader` + the prose from `document/bookingText.ts` + mobile/bus lines + signature block + `LetterheadFooter`, sized in CSS **millimetres** to the chosen paper (`document/pageSizes.ts`). Preview, thumbnails, print, PNG/JPG capture and PDF all render this same element — there is no separate document model or template engine.

Invariants that everything else relies on:

- `.sheet` must never carry a CSS `transform`. `features/editor/SheetPreview.tsx` scales a wrapper (`.preview-transform`) instead, so exporters capture the sheet at 1:1 via `sheetRef`.
- Every dimension in `document/sheet.css` derives from `--u` = 1/100 of the page's **shorter** side. Add new sheet styles the same way; never use px. `sheet.css` stays plain CSS (not Tailwind) and forces `color-scheme: light` — the page is paper and ignores the app theme.
- The pad colour is the `--brand` custom property set inline by `BookingSheet` from `document/padColors.ts`; all letterhead artwork uses `currentColor`/`--brand`.
- Fit-to-one-page lives in `document/useFitText.ts`: it binary-searches `--body-scale` on `.lh-content` until `.lh-body` stops overflowing, and refits after `document.fonts.ready`. It measures with `scrollHeight`/`clientHeight`, which ignore transforms. The sheet must remain laid out (never `display: none`/`hidden`) for this and for export — on phones the editor parks the hidden pane off-screen with `EDITOR.PREVIEW_PARKED` (`config/constants.ts`).
- Fixed letterhead text lives only in `document/letterheadContent.ts`; the booking sentences live in `document/bookingText.ts`. Fonts are bundled via `@fontsource/*` imports in `main.tsx` (never fetched from Google) so output is identical offline and inside the shells.
- `document/hindiTime.ts` renders `HH:mm` as the operator writes it (सुबह 4–11, दोपहर 12–13, शाम 14–19, रात 20–3; साढ़े/डेढ़/ढाई); `document/amountWords.ts` writes rupees in Hindi with Indian numbering.

### Export pipeline

`export/exporter.ts` defines `DocumentExporter` (`toImage`, `toPdf`, `print`, `share`, `download`, `pdfKind`). `export/index.ts#getExporter()` picks the implementation; today only `webExporter.ts` exists. Electron/Capacitor exporters belong there too, so feature code never branches on platform.

The web exporter captures the DOM with `html-to-image` (lazy-loaded; pre-bundled via `optimizeDeps` so the dev optimizer does not reload mid-export) — the browser does the Devanagari shaping, which jsPDF/pdfmake/react-pdf cannot. `pixelRatioFor` targets 300 dpi but caps total pixels at 24 MP so A0–A2 do not exhaust memory on phones. The PDF is that PNG placed on a page of the exact size in points via `pdf-lib`. Printing injects an `@page { size }` rule for the current paper and relies on `styles/print.css`, which is unlayered so it beats every Tailwind utility and hides everything except the sheet (hook classes: `app-shell`, `app-main`, `no-print`, `editor`, `editor-panes`, `preview-pane`, `preview-scaler`, `preview-transform`).

### Storage

`storage/db.ts` — Dexie database `srbs-letters`, **version 2**: `bookings` (indexed `id, seq, bookingDate, travelDate, updatedAt`) and `meta` (`nextSeq`, `letterNoPrefix`). Version 1 (the old `letters` table) is declared so existing devices migrate and keep their number sequence. `BookingRecord` is flat JSON on purpose so it can mirror to Supabase later; `issuedDate` is not stored (derived from `createdAt`), `balance` is not stored (derived).

`storage/bookings.ts` — the repository (`create`, `get`, `update`, `list(query)`, `duplicate`, `remove`). `create` allocates the sequence inside a read-write transaction over `bookings` + `meta`. Search is a client-side substring filter over number/name/place/route/mobile/bus/dates. `bookingsRepo(db)` takes an injectable db for tests.

The editor (`features/editor/BookingEditor.tsx`) only creates the record on the **first edit**, so opening `/new` and leaving never burns a पत्रांक; it then `navigate`s to `/bookings/:id` with `replace`. `/new` reads `?template=&color=` (validated with `isTemplateId` / `isPadColorId`). Autosave is debounced 400 ms and flushed on unmount. `useLiveQuery` (dexie-react-hooks) keeps the list live.

### Templates

`templates/registry.ts` — `TemplateDef` (bilingual name/description, default pad colour, `newFields`, `sampleContent` for thumbnails/previews, `Sheet`, `routes`). `templates/ids.ts` holds the id union so `storage/` can import it without a cycle. The gallery and start page render whatever is registered.

### Styling and theming

Tailwind v4 via `@tailwindcss/vite`; there is no `tailwind.config.js`. `index.css` imports Tailwind and `styles/tokens.css`, whose `@theme` block mirrors project-dashboard's tokens (`--color-page-bg`, `--color-surface`, `--color-border`, `--color-text-primary/secondary`, `--color-accent(-subtle)`, success/warning/danger, `--color-scrim`) with a `.dark` override block. Dark mode is `@custom-variant dark (&:where(.dark, .dark *))`; `theme/ThemeProvider.tsx` toggles the class and `index.html` applies it before first paint (localStorage key `theme`). `config/constants.ts` holds shared class strings (`FORM.INPUT`, `A11Y.FOCUS_RING`, `EDITOR.*`) — keep them static literals so Tailwind's scanner sees them.

### i18n

`i18n/strings.ts` — `en` is the source of truth for keys; `hi` must define every key (typed + tested). `useLocale()` gives `t(key, vars)` with `{name}` interpolation; `pick(bilingual, locale)` for registry names. Persisted as `srbs.locale`, applied to `<html lang>`. Default locale is `DEFAULT_LOCALE` (`'en'`; the owner has not chosen). The transliteration module takes its aria labels as props so it stays i18n-free.

### Routing

`HashRouter`, because the same `dist/` will be loaded from `file://` inside Electron and Capacitor. `vite.config.ts` sets `base: './'` for the same reason. Routes: `/` gallery, `/templates/:templateId`, `/new`, `/bookings`, `/bookings/:id`.

## Conventions

- No semicolons, single quotes, 2-space indent. ESLint runs the React Compiler-era `react-hooks` rules: no ref writes during render, no `setState` directly in effects (adjust state during render instead), no mutation of ref-held objects (rebuild arrays/objects), no impure calls like `Date.now()` in render (put them in state initialisers). Context/provider/hook live in separate files for `react-refresh/only-export-components`.
- Icons come from `lucide-react` only.
- Keep `document/` free of app state, router, storage and i18n imports so it can be reused by the shells unchanged.

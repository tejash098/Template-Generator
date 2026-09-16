# Template Generator (Shri Ram Bus Service)

A local-first, offline-capable document generator for Shri Ram Bus Service (a bus operator in Bhabhua, Bihar). It allows staff to generate bus booking receipts (for baraat / hire bookings) on a fixed printed letterhead. The app is a React Single Page Application (SPA) that stores data locally and generates PDFs, PNGs, and printed documents on demand.

## Features

- **Offline-First**: Fully usable without an internet connection. Data is stored locally using IndexedDB (via Dexie). No account is required.
- **Auto-Generated Letterheads**: Generates a beautiful digital letterhead with customizable pad colors (navy, orange, green, maroon, black).
- **Hindi Prose Generation**: Takes form inputs (name, route, dates, fare, etc.) and automatically generates the booking receipt in natural Hindi prose (like the handwritten originals).
- **Smart Transliteration**: Built-in Roman-to-Devanagari transliteration. It uses an online provider when available, and falls back to an offline rule engine for typing Hindi instantly.
- **Export & Print**:
  - Export documents to PDF or high-quality PNG.
  - Native print support (scales to fit Letter, Legal, A4, etc.).
- **Auto-assigned numbers**: Automatically assigns and tracks sequence numbers (पत्रांक).
- **Bilingual UI**: Toggle between English and Hindi for the user interface (the generated document is always in Hindi).
- **Dark Mode**: Fully supports light and dark themes.

## Tech Stack

- **Framework**: React 19, TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **Database**: Dexie.js (IndexedDB wrapper)
- **Document Rendering/Export**: `html-to-image` for capturing the DOM and `pdf-lib` for PDF generation.
- **Icons**: Lucide React
- **Fonts**: Pre-bundled `@fontsource` packages for consistent rendering (Mukta, Rozha One, Tiro Devanagari Hindi).

## Development

### Prerequisites
- Node.js (v20+ recommended)
- npm

### Commands

```bash
# Install dependencies
npm install

# Start the Vite dev server (http://localhost:5173)
npm run dev

# Build the project for production (outputs to dist/)
npm run build

# Preview the production build locally
npm run preview

# Run typechecking only
npm run typecheck

# Run ESLint
npm run lint

# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Architecture Notes

- **The Document as Source of Truth**: The rendering logic (`src/document/BookingSheet.tsx`) acts as the single source of truth for generating previews, prints, and image/PDF exports. It is carefully crafted to be platform-neutral.
- **Storage**: Only the raw form data is stored in the database. Documents are always re-rendered on the fly, saving storage space and avoiding stale document structures.
- **Routing**: Uses `HashRouter` to ensure the compiled output can be served over `file://` (useful for planned Capacitor and Electron wrappers).
- **Exporting Pipeline**: The web exporter captures the HTML layout via `html-to-image` (to ensure accurate Devanagari font shaping in the browser) and embeds the image onto a generated PDF via `pdf-lib`.

## Future Milestones
- **Milestone 2**: Capacitor (Mobile App) and Electron (Desktop App) wrappers.
- **Milestone 3**: Supabase authentication and cloud synchronization for per-staff logins and sharing capabilities.

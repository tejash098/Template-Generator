import { LETTERHEAD } from './letterheadContent'

/*
 * Recreation of the printed letterhead artwork. The bus and swastika are
 * drawn as inline SVG so they stay crisp at any page size and need no image
 * assets (the original print files were not available; only a photo).
 */

function BusIcon({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <svg
      className="lh-bus"
      viewBox="0 0 120 60"
      aria-hidden="true"
      style={mirrored ? { transform: 'scaleX(-1)' } : undefined}
    >
      <g fill="currentColor">
        <path d="M6 14q0-6 6-6h84q10 0 16 10l4 8v14q0 4-4 4H10q-4 0-4-4z" />
        <circle cx="30" cy="48" r="8" />
        <circle cx="90" cy="48" r="8" />
      </g>
      <g fill="#fff">
        <rect x="14" y="14" width="14" height="12" rx="2" />
        <rect x="32" y="14" width="14" height="12" rx="2" />
        <rect x="50" y="14" width="14" height="12" rx="2" />
        <rect x="68" y="14" width="14" height="12" rx="2" />
        <path d="M88 14h8q6 0 10 6l3 6H88z" />
        <circle cx="30" cy="48" r="3.5" />
        <circle cx="90" cy="48" r="3.5" />
      </g>
    </svg>
  )
}

/** The auspicious swastika printed at the top-centre of the pad. */
function SwastikaIcon() {
  return (
    <svg className="lh-swastika" viewBox="0 0 100 100" aria-hidden="true">
      <path
        d="M50 12V88M12 50H88M50 12H88M88 50V88M50 88H12M12 50V12"
        stroke="currentColor"
        strokeWidth="11"
        fill="none"
      />
      <g fill="currentColor">
        <circle cx="31" cy="31" r="5" />
        <circle cx="69" cy="31" r="5" />
        <circle cx="31" cy="69" r="5" />
        <circle cx="69" cy="69" r="5" />
      </g>
    </svg>
  )
}

export function LetterheadHeader({ letterNo, date }: { letterNo: string; date: string }) {
  return (
    <header className="lh-head">
      <div className="lh-topline">
        <span>{LETTERHEAD.proprietorLine}</span>
        <SwastikaIcon />
        <span>{LETTERHEAD.mobileLine}</span>
      </div>
      <div className="lh-title-row">
        <BusIcon />
        <h1 className="lh-title">{LETTERHEAD.title}</h1>
        <BusIcon mirrored />
      </div>
      <div className="lh-address">{LETTERHEAD.address}</div>
      <div className="lh-meta">
        <div className="lh-meta-row lh-meta-right">
          <span className="lh-meta-label">{LETTERHEAD.dateLabel}</span>
          <span className="lh-meta-value">{date}</span>
        </div>
        <div className="lh-meta-row">
          <span className="lh-meta-label">{LETTERHEAD.letterNoLabel}</span>
          <span className="lh-meta-value">{letterNo}</span>
        </div>
      </div>
    </header>
  )
}

export function LetterheadFooter() {
  return (
    <footer className="lh-foot">
      {LETTERHEAD.footerNotes.map((note) => (
        <p key={note}>{note}</p>
      ))}
    </footer>
  )
}

import { BUS_PATH } from './busPath'
import { LETTERHEAD } from './letterheadContent'

/*
 * Recreation of the printed letterhead artwork. The bus (owner-supplied
 * line art, see busPath.ts) and swastika are inline SVG painted with
 * currentColor, so they stay crisp at any page size and follow the pad colour.
 */

function BusIcon({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <svg
      className="lh-bus"
      viewBox="9 17 108 89"
      aria-hidden="true"
      style={mirrored ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path d={BUS_PATH} fill="currentColor" fillRule="evenodd" stroke="currentColor" strokeWidth="0.25" strokeLinejoin="round" />
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

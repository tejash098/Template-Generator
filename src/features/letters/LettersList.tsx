import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatDateDdMmYyyy } from '../../document/format'
import { describePage } from '../../document/pageSizes'
import { letters } from '../../storage/letters'

/** Saved letters, newest first, with search, duplicate and delete. */
export function LettersList() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const rows = useLiveQuery(() => letters.list(query), [query])

  const duplicate = async (id: string) => {
    const copy = await letters.duplicate(id)
    navigate(`/letters/${copy.id}`)
  }

  const remove = async (id: string, letterNo: string) => {
    if (!window.confirm(`Delete letter ${letterNo}? This cannot be undone.`)) return
    await letters.remove(id)
  }

  return (
    <div className="letters">
      <div className="letters-toolbar">
        <input
          type="search"
          className="search"
          placeholder="Search by number, subject, recipient, text…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search letters"
        />
        <Link className="btn btn-primary" to="/new">
          New letter
        </Link>
      </div>

      {rows === undefined ? (
        <p className="hint">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <p>{query ? 'No letters match your search.' : 'No letters yet.'}</p>
          {!query && (
            <Link className="btn btn-primary" to="/new">
              Write the first letter
            </Link>
          )}
        </div>
      ) : (
        <ul className="letter-list">
          {rows.map((l) => (
            <li key={l.id} className="letter-row">
              <Link to={`/letters/${l.id}`} className="letter-main">
                <span className="letter-no">पत्रांक {l.letterNo}</span>
                <span className="letter-date">{formatDateDdMmYyyy(l.date)}</span>
                <span className="letter-subject" lang="hi">
                  {l.subject || <em>(no subject)</em>}
                </span>
                <span className="letter-recipient" lang="hi">
                  {l.recipient.split('\n')[0]}
                </span>
                <span className="letter-page">{describePage(l.page)}</span>
              </Link>
              <div className="letter-actions">
                <button type="button" className="btn btn-small" onClick={() => duplicate(l.id)}>
                  Duplicate
                </button>
                <button type="button" className="btn btn-small btn-danger" onClick={() => remove(l.id, l.letterNo)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

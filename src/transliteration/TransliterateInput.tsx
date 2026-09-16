import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react'
import { flushSync } from 'react-dom'
import { currentWord, type CurrentWord } from './currentWord'
import { fetchHindiSuggestions } from './googleInputTools'
import { transliterateWord } from './offlineRules'
import './transliterate.css'

/*
 * A text field that turns Roman typing into Devanagari as you go, Google
 * Input Tools style: the word being typed gets suggestions; space, Enter or
 * punctuation commits the highlighted one.
 *
 * Latency strategy: the offline rule engine answers instantly, so a commit
 * never waits on the network. If the online lookup for that exact word lands
 * a moment later, the just-committed text is upgraded in place (only if it is
 * still untouched). Network failures switch to offline-only for a while.
 */

type FieldElement = HTMLInputElement | HTMLTextAreaElement

interface TransliterateInputProps {
  value: string
  onChange: (value: string) => void
  /** When false the field is an ordinary input (for pasting Hindi or typing English). */
  enabled: boolean
  multiline?: boolean
  id?: string
  placeholder?: string
  rows?: number
  className?: string
}

interface InFlight {
  word: string
  controller: AbortController
}

/** An offline commit that may still be replaced by the online result. */
interface PendingUpgrade {
  word: string
  start: number
  text: string
}

const MAX_PENDING_UPGRADES = 12

/** Caret to restore once React has rendered exactly `forValue`. */
interface PendingCaret {
  position: number
  forValue: string
}

/** Keys that end the current word and trigger transliteration. */
const COMMIT_KEYS = new Set([' ', 'Enter', ',', '.', '।', '?', '!', ':', ';', ')', '(', '-', '/', '|'])
const SUGGEST_DEBOUNCE_MS = 90
const OFFLINE_RETRY_MS = 30_000

let offlineUntil = 0
const onlineAllowed = () =>
  Date.now() >= offlineUntil && !(typeof navigator !== 'undefined' && navigator.onLine === false)

export function TransliterateInput({
  value,
  onChange,
  enabled,
  multiline = false,
  id,
  placeholder,
  rows = 6,
  className,
}: TransliterateInputProps) {
  const fieldRef = useRef<FieldElement>(null)
  const pendingCaret = useRef<PendingCaret | null>(null)
  const debounceTimer = useRef<number | undefined>(undefined)
  const suggestLookup = useRef<InFlight | null>(null)
  const pendingUpgrades = useRef<PendingUpgrade[]>([])
  const upgradeLookups = useRef(new Set<string>())
  const onChangeRef = useRef(onChange)

  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggestionsFor, setSuggestionsFor] = useState('')
  const [source, setSource] = useState<'online' | 'offline'>('online')
  const [active, setActive] = useState(0)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const clearSuggestions = useCallback(() => {
    window.clearTimeout(debounceTimer.current)
    setSuggestions([])
    setSuggestionsFor('')
    setActive(0)
  }, [])

  // Restore the caret after a programmatic replacement re-renders the value.
  // Guarded by the value it was computed for, so a lost or superseded update
  // can never drop the caret into the middle of other text.
  useLayoutEffect(() => {
    const el = fieldRef.current
    const pending = pendingCaret.current
    if (!el || !pending) return
    pendingCaret.current = null
    if (pending.forValue === value) el.setSelectionRange(pending.position, pending.position)
  }, [value])

  // Drop suggestions the moment Hindi typing is switched off (state adjusted
  // during render, so no extra effect pass).
  const [prevEnabled, setPrevEnabled] = useState(enabled)
  if (prevEnabled !== enabled) {
    setPrevEnabled(enabled)
    setSuggestions([])
    setSuggestionsFor('')
    setActive(0)
  }

  useEffect(() => {
    if (!enabled) {
      window.clearTimeout(debounceTimer.current)
      suggestLookup.current?.controller.abort()
      pendingUpgrades.current = []
    }
  }, [enabled])

  useEffect(
    () => () => {
      window.clearTimeout(debounceTimer.current)
      suggestLookup.current?.controller.abort()
      pendingUpgrades.current = []
    },
    [],
  )

  /**
   * Replace an offline-committed word with the online spelling, provided the
   * text is still exactly what was committed. Later pending upgrades have
   * their offsets shifted by the length change.
   */
  const applyUpgrade = useCallback((word: string, online: string[]) => {
    const el = fieldRef.current
    const replacement = online[0]
    if (!el || !replacement) return
    const matches = pendingUpgrades.current.filter((u) => u.word === word)
    pendingUpgrades.current = pendingUpgrades.current.filter((u) => u.word !== word)

    let text = el.value
    let caret = el.selectionStart ?? text.length
    let changed = false
    // Apply from the end so earlier offsets stay valid while we go.
    for (const up of matches.sort((a, b) => b.start - a.start)) {
      if (text.slice(up.start, up.start + up.text.length) !== up.text || replacement === up.text) continue
      const delta = replacement.length - up.text.length
      text = text.slice(0, up.start) + replacement + text.slice(up.start + up.text.length)
      if (caret >= up.start + up.text.length) caret += delta
      pendingUpgrades.current = pendingUpgrades.current.map((o) =>
        o.start > up.start ? { ...o, start: o.start + delta } : o,
      )
      changed = true
    }
    if (!changed) return
    pendingCaret.current = { position: caret, forValue: text }
    // Synchronous so no keystroke can interleave with a half-applied upgrade.
    flushSync(() => onChangeRef.current(text))
  }, [])

  const markNetworkFailure = (err: unknown) => {
    if ((err as Error).name === 'AbortError') return
    offlineUntil = Date.now() + OFFLINE_RETRY_MS
  }

  /** Online lookup for the word being typed; supersedes the previous one. */
  const lookupForSuggestions = useCallback(
    (word: string) => {
      if (!onlineAllowed() || suggestLookup.current?.word === word) return
      suggestLookup.current?.controller.abort()
      const controller = new AbortController()
      suggestLookup.current = { word, controller }

      fetchHindiSuggestions(word, { signal: controller.signal })
        .then((online) => {
          if (controller.signal.aborted || online.length === 0) return
          const el = fieldRef.current
          if (!el) return
          const typing = currentWord(el.value, el.selectionStart ?? el.value.length)
          if (typing?.text === word) {
            setSuggestions(online)
            setSuggestionsFor(word)
            setSource('online')
            setActive(0)
          } else {
            // Committed meanwhile with the offline guess.
            applyUpgrade(word, online)
          }
        })
        .catch(markNetworkFailure)
        .finally(() => {
          if (suggestLookup.current?.controller === controller) suggestLookup.current = null
        })
    },
    [applyUpgrade],
  )

  /** Online lookup for a word already committed offline; never aborted. */
  const lookupForUpgrade = useCallback(
    (word: string) => {
      if (!onlineAllowed() || upgradeLookups.current.has(word)) return
      if (suggestLookup.current?.word === word) {
        // The suggestion request will finish the job; stop it being aborted.
        suggestLookup.current = null
        return
      }
      upgradeLookups.current.add(word)
      fetchHindiSuggestions(word)
        .then((online) => applyUpgrade(word, online))
        .catch(markNetworkFailure)
        .finally(() => upgradeLookups.current.delete(word))
    },
    [applyUpgrade],
  )

  const refreshSuggestions = useCallback(
    (text: string, caret: number) => {
      const word = currentWord(text, caret)
      if (!word) {
        clearSuggestions()
        return
      }
      // Offline result first so there is always something to commit instantly.
      setSuggestions([transliterateWord(word.text)])
      setSuggestionsFor(word.text)
      setSource('offline')
      setActive(0)

      window.clearTimeout(debounceTimer.current)
      debounceTimer.current = window.setTimeout(() => lookupForSuggestions(word.text), SUGGEST_DEBOUNCE_MS)
    },
    [clearSuggestions, lookupForSuggestions],
  )

  /** Replace `word` with the best available Hindi plus `typed`. */
  const commitWord = useCallback(
    (el: FieldElement, word: CurrentWord, typed: string) => {
      const online = suggestionsFor === word.text && source === 'online' ? suggestions[active] : undefined
      const replacement = online ?? transliterateWord(word.text)
      const caret = el.selectionStart ?? el.value.length
      const next = el.value.slice(0, word.start) + replacement + typed + el.value.slice(caret)
      pendingCaret.current = { position: word.start + replacement.length + typed.length, forValue: next }
      clearSuggestions()

      if (!online) {
        // Let the network improve this word shortly, if it can.
        pendingUpgrades.current = [
          ...pendingUpgrades.current.slice(-(MAX_PENDING_UPGRADES - 1)),
          { word: word.text, start: word.start, text: replacement },
        ]
        lookupForUpgrade(word.text)
      }
      onChange(next)
    },
    [active, clearSuggestions, lookupForUpgrade, onChange, source, suggestions, suggestionsFor],
  )

  const insertAtCaret = (el: FieldElement, text: string) => {
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? start
    const next = el.value.slice(0, start) + text + el.value.slice(end)
    pendingCaret.current = { position: start + text.length, forValue: next }
    onChange(next)
  }

  const handleChange = (e: ChangeEvent<FieldElement>) => {
    const el = e.target
    onChange(el.value)
    if (enabled) refreshSuggestions(el.value, el.selectionStart ?? el.value.length)
  }

  const handleKeyDown = (e: KeyboardEvent<FieldElement>) => {
    if (!enabled || e.nativeEvent.isComposing || e.ctrlKey || e.metaKey || e.altKey) return
    const el = e.currentTarget

    if (suggestions.length > 1 && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      setActive((i) => (i + (e.key === 'ArrowDown' ? 1 : suggestions.length - 1)) % suggestions.length)
      return
    }
    if (e.key === 'Escape' && suggestions.length) {
      e.preventDefault()
      clearSuggestions()
      return
    }
    if (!COMMIT_KEYS.has(e.key)) return

    const typed = e.key === 'Enter' ? (multiline ? '\n' : '') : e.key === '|' ? '।' : e.key
    const word = currentWord(el.value, el.selectionStart ?? el.value.length)
    if (word) {
      e.preventDefault()
      commitWord(el, word, typed)
    } else if (e.key === '|') {
      e.preventDefault()
      insertAtCaret(el, typed)
    }
  }

  const handleBlur = () => {
    const el = fieldRef.current
    if (!enabled || !el) return
    const word = currentWord(el.value, el.selectionStart ?? el.value.length)
    if (word) commitWord(el, word, '')
    else clearSuggestions()
  }

  const pickSuggestion = (index: number) => {
    const el = fieldRef.current
    if (!el) return
    const word = currentWord(el.value, el.selectionStart ?? el.value.length)
    if (word) {
      const replacement = suggestions[index]
      const next = el.value.slice(0, word.start) + replacement + ' ' + el.value.slice(el.selectionStart ?? el.value.length)
      pendingCaret.current = { position: word.start + replacement.length + 1, forValue: next }
      clearSuggestions()
      onChange(next)
    }
    el.focus()
  }

  const fieldProps = {
    id,
    value,
    placeholder,
    className,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    onBlur: handleBlur,
    autoComplete: 'off',
    spellCheck: false,
    lang: 'hi',
  }

  return (
    <div className="xlit">
      {multiline ? (
        <textarea ref={fieldRef as RefObject<HTMLTextAreaElement | null>} rows={rows} {...fieldProps} />
      ) : (
        <input ref={fieldRef as RefObject<HTMLInputElement | null>} type="text" {...fieldProps} />
      )}
      {enabled && suggestions.length > 0 && (
        <div className="xlit-strip" role="listbox" aria-label="Hindi suggestions">
          {suggestions.map((s, i) => (
            <button
              key={`${i}-${s}`}
              type="button"
              role="option"
              aria-selected={i === active}
              className={i === active ? 'xlit-option is-active' : 'xlit-option'}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pickSuggestion(i)}
            >
              {s}
            </button>
          ))}
          {source === 'offline' && <span className="xlit-source">offline</span>}
        </div>
      )}
    </div>
  )
}

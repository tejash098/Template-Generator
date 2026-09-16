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
import { fetchHindiSuggestions } from './googleInputTools'
import { transliterateWord } from './offlineRules'
import './transliterate.css'

/*
 * A text field that turns Roman typing into Devanagari as you go, Google
 * Input Tools style: the word being typed gets suggestions; space, Enter or
 * punctuation commits the highlighted one. Works fully offline via the
 * rule-based fallback, and switches back to online suggestions automatically.
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

interface CurrentWord {
  start: number
  text: string
}

/** Keys that end the current word and trigger transliteration. */
const COMMIT_KEYS = new Set([' ', 'Enter', ',', '.', '।', '?', '!', ':', ';', ')', '(', '-', '/', '|'])
const SUGGEST_DEBOUNCE_MS = 90
const OFFLINE_RETRY_MS = 30_000

let offlineUntil = 0

/**
 * The Roman word immediately before the caret, if it should be transliterated.
 * Skips anything with digits (BR24P8555) and all-caps tokens (AM, RTA).
 */
export function currentWord(text: string, caret: number): CurrentWord | null {
  const m = /[A-Za-z0-9]+$/.exec(text.slice(0, caret))
  if (!m) return null
  const word = m[0]
  if (!/^[A-Za-z]+$/.test(word)) return null
  if (word.length > 1 && word === word.toUpperCase()) return null
  return { start: caret - word.length, text: word }
}

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
  const pendingCaret = useRef<number | null>(null)
  const debounceTimer = useRef<number | undefined>(undefined)
  const abortRef = useRef<AbortController | null>(null)

  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggestionsFor, setSuggestionsFor] = useState('')
  const [source, setSource] = useState<'online' | 'offline'>('online')
  const [active, setActive] = useState(0)

  const clearSuggestions = useCallback(() => {
    window.clearTimeout(debounceTimer.current)
    abortRef.current?.abort()
    setSuggestions([])
    setSuggestionsFor('')
    setActive(0)
  }, [])

  // Restore the caret after a programmatic replacement re-renders the value.
  useLayoutEffect(() => {
    const el = fieldRef.current
    if (el && pendingCaret.current !== null) {
      el.setSelectionRange(pendingCaret.current, pendingCaret.current)
      pendingCaret.current = null
    }
  }, [value])

  useEffect(() => {
    if (!enabled) clearSuggestions()
  }, [enabled, clearSuggestions])

  useEffect(() => () => clearSuggestions(), [clearSuggestions])

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
      abortRef.current?.abort()
      if (Date.now() < offlineUntil || (typeof navigator !== 'undefined' && navigator.onLine === false)) return

      debounceTimer.current = window.setTimeout(async () => {
        const controller = new AbortController()
        abortRef.current = controller
        try {
          const online = await fetchHindiSuggestions(word.text, { signal: controller.signal })
          if (controller.signal.aborted || online.length === 0) return
          setSuggestions(online)
          setSuggestionsFor(word.text)
          setSource('online')
          setActive(0)
        } catch (err) {
          if ((err as Error).name === 'AbortError') return
          offlineUntil = Date.now() + OFFLINE_RETRY_MS
        }
      }, SUGGEST_DEBOUNCE_MS)
    },
    [clearSuggestions],
  )

  /** Replace `word` with `replacement` (already including any trailing char). */
  const commit = useCallback(
    (el: FieldElement, word: CurrentWord, replacement: string) => {
      const caret = el.selectionStart ?? el.value.length
      const next = el.value.slice(0, word.start) + replacement + el.value.slice(caret)
      pendingCaret.current = word.start + replacement.length
      clearSuggestions()
      onChange(next)
    },
    [clearSuggestions, onChange],
  )

  const bestFor = (word: CurrentWord) =>
    suggestionsFor === word.text && suggestions[active] ? suggestions[active] : transliterateWord(word.text)

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

    const word = currentWord(el.value, el.selectionStart ?? el.value.length)
    const typed = e.key === 'Enter' ? (multiline ? '\n' : '') : e.key === '|' ? '।' : e.key
    if (!word) {
      if (e.key === '|') {
        e.preventDefault()
        commit(el, { start: el.selectionStart ?? el.value.length, text: '' }, typed)
      }
      return
    }
    e.preventDefault()
    commit(el, word, bestFor(word) + typed)
  }

  const handleBlur = () => {
    const el = fieldRef.current
    if (!enabled || !el) return
    const word = currentWord(el.value, el.selectionStart ?? el.value.length)
    if (word) commit(el, word, bestFor(word))
    else clearSuggestions()
  }

  const pickSuggestion = (s: string) => {
    const el = fieldRef.current
    if (!el) return
    const word = currentWord(el.value, el.selectionStart ?? el.value.length)
    if (word) commit(el, word, s + ' ')
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
              onClick={() => pickSuggestion(s)}
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

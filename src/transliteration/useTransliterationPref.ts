import { useCallback, useState } from 'react'

const STORAGE_KEY = 'srbs.transliterate'

/** Global "Hindi typing" switch, remembered per device. Defaults to on. */
export function useTransliterationPref(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'off'
    } catch {
      return true
    }
  })

  const update = useCallback((next: boolean) => {
    setEnabled(next)
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off')
    } catch {
      // Private mode / blocked storage: the preference just does not persist.
    }
  }, [])

  return [enabled, update]
}

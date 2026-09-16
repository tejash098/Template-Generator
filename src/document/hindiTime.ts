/**
 * Renders a 24h "HH:mm" as the operator writes it on the pad: "शाम 2 बजे",
 * "सुबह 6 बजे", "रात साढ़े 8 बजे". Period boundaries follow the samples, where
 * 2 pm and 5 pm are both "शाम". Western digits per the date/number rule.
 */
export type DayPeriod = 'सुबह' | 'दोपहर' | 'शाम' | 'रात'

export function periodOfDay(hour: number): DayPeriod {
  if (hour >= 4 && hour <= 11) return 'सुबह'
  if (hour >= 12 && hour <= 13) return 'दोपहर'
  if (hour >= 14 && hour <= 19) return 'शाम'
  return 'रात'
}

/** '' for empty or malformed input. */
export function formatTimeHindi(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return ''
  const hour = Number(m[1])
  const minute = Number(m[2])
  if (hour > 23 || minute > 59) return ''

  const period = periodOfDay(hour)
  const h12 = hour % 12 || 12
  if (minute === 0) return `${period} ${h12} बजे`
  if (minute === 30) {
    const half = h12 === 1 ? 'डेढ़' : h12 === 2 ? 'ढाई' : `साढ़े ${h12}`
    return `${period} ${half} बजे`
  }
  return `${period} ${h12}:${String(minute).padStart(2, '0')} बजे`
}

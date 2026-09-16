/** Date helpers. Letters store dates as ISO `yyyy-mm-dd` and display `dd/mm/yyyy`. */

export function todayIso(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDateDdMmYyyy(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  return `${m[3]}/${m[2]}/${m[1]}`
}

/** Safe, filesystem-friendly stem for downloaded files. */
export function fileStem(letterNo: string, iso: string): string {
  return `SRBS-${letterNo}-${iso}`.replace(/[^A-Za-z0-9._-]+/g, '_')
}

/** Rupee amounts as written on the pad: 15000 → "15000/-". */
export const formatRupees = (amount: number): string => `${Math.round(amount)}/-`

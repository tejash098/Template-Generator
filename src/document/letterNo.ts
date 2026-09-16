/**
 * पत्रांक (letter/reference number) formatting.
 *
 * Numbers are allocated sequentially per device (see storage/letters.ts).
 * `prefix` is reserved for a per-device/per-agency prefix so that letters
 * created offline on two devices cannot collide once cloud sync exists.
 */
export const LETTER_NO_WIDTH = 4

export function formatLetterNo(seq: number, prefix = ''): string {
  if (!Number.isInteger(seq) || seq < 1) throw new Error(`Invalid sequence number: ${seq}`)
  return `${prefix}${String(seq).padStart(LETTER_NO_WIDTH, '0')}`
}

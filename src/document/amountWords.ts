/**
 * Rupee amounts in Hindi words, Indian numbering (सौ, हजार, लाख, करोड़).
 * Hindi has a distinct name for every number 0–99, hence the table.
 */
export const HINDI_ONES: readonly string[] = [
  'शून्य', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ',
  'दस', 'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस',
  'बीस', 'इक्कीस', 'बाईस', 'तेईस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताईस', 'अट्ठाईस', 'उनतीस',
  'तीस', 'इकतीस', 'बत्तीस', 'तैंतीस', 'चौंतीस', 'पैंतीस', 'छत्तीस', 'सैंतीस', 'अड़तीस', 'उनतालीस',
  'चालीस', 'इकतालीस', 'बयालीस', 'तैंतालीस', 'चौवालीस', 'पैंतालीस', 'छियालीस', 'सैंतालीस', 'अड़तालीस', 'उनचास',
  'पचास', 'इक्यावन', 'बावन', 'तिरपन', 'चौवन', 'पचपन', 'छप्पन', 'सत्तावन', 'अट्ठावन', 'उनसठ',
  'साठ', 'इकसठ', 'बासठ', 'तिरसठ', 'चौंसठ', 'पैंसठ', 'छियासठ', 'सड़सठ', 'अड़सठ', 'उनहत्तर',
  'सत्तर', 'इकहत्तर', 'बहत्तर', 'तिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छिहत्तर', 'सतहत्तर', 'अठहत्तर', 'उनासी',
  'अस्सी', 'इक्यासी', 'बयासी', 'तिरासी', 'चौरासी', 'पचासी', 'छियासी', 'सत्तासी', 'अट्ठासी', 'नवासी',
  'नब्बे', 'इक्यानवे', 'बानवे', 'तिरानवे', 'चौरानवे', 'पंचानवे', 'छियानवे', 'सत्तानवे', 'अट्ठानवे', 'निन्यानवे',
]

export const MAX_AMOUNT = 999_999_999_999

/** e.g. 12001 → "बारह हजार एक", 250000 → "दो लाख पचास हजार". */
export function amountToHindiWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > MAX_AMOUNT) throw new RangeError(`Unsupported amount: ${n}`)
  if (n === 0) return HINDI_ONES[0]

  const crore = Math.floor(n / 1e7)
  const lakh = Math.floor((n % 1e7) / 1e5)
  const thousand = Math.floor((n % 1e5) / 1000)
  const hundred = Math.floor((n % 1000) / 100)
  const rest = n % 100

  const parts: string[] = []
  if (crore) parts.push(`${crore > 99 ? amountToHindiWords(crore) : HINDI_ONES[crore]} करोड़`)
  if (lakh) parts.push(`${HINDI_ONES[lakh]} लाख`)
  if (thousand) parts.push(`${HINDI_ONES[thousand]} हजार`)
  if (hundred) parts.push(`${HINDI_ONES[hundred]} सौ`)
  if (rest) parts.push(HINDI_ONES[rest])
  return parts.join(' ')
}

/** Formal variant: "पंद्रह हजार रुपये मात्र". */
export const rupeesInWords = (n: number): string => `${amountToHindiWords(n)} रुपये मात्र`

/** Receipt variant, bracketed after the figure: "केवल पंद्रह हजार रुपये मात्र". */
export const rupeesOnly = (n: number): string => `केवल ${rupeesInWords(n)}`

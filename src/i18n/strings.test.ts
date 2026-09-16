import { describe, expect, it } from 'vitest'
import { en, hi } from './strings'
import { translate } from './translate'

describe('string tables', () => {
  it('define the same keys in both languages with no empty values', () => {
    expect(Object.keys(hi).sort()).toEqual(Object.keys(en).sort())
    for (const [key, value] of Object.entries({ ...en, ...hi })) {
      expect(value, key).not.toBe('')
    }
  })

  it('keep every placeholder in the Hindi translation', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      const placeholders = en[key].match(/\{\w+\}/g) ?? []
      for (const p of placeholders) expect(hi[key], key).toContain(p)
    }
  })
})

describe('translate', () => {
  it('substitutes placeholders and leaves unknown ones alone', () => {
    expect(translate('en', 'editor.number', { no: '0007' })).toBe('Booking 0007')
    expect(translate('hi', 'editor.number', { no: '0007' })).toBe('बुकिंग 0007')
    expect(translate('en', 'editor.number')).toBe('Booking {no}')
  })
})

import { describe, expect, it } from 'vitest'
import { currentWord } from './currentWord'

describe('currentWord', () => {
  it('finds the Roman word before the caret', () => {
    expect(currentWord('सेवा mein', 9)).toEqual({ start: 5, text: 'mein' })
  })

  it('ignores a caret that is not at a Roman word', () => {
    expect(currentWord('सेवा में ', 9)).toBeNull()
    expect(currentWord('abc def', 3)).toEqual({ start: 0, text: 'abc' })
    expect(currentWord('abc def', 4)).toBeNull()
  })

  it('skips vehicle numbers and acronyms', () => {
    expect(currentWord('BR24P8555', 9)).toBeNull()
    expect(currentWord('9:11 AM', 7)).toBeNull()
    expect(currentWord('BR24P', 5)).toBeNull()
  })
})

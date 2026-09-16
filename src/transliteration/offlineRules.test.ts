import { describe, expect, it } from 'vitest'
import { transliterateText, transliterateWord } from './offlineRules'

describe('transliterateWord', () => {
  it.each([
    ['namaste', 'नमस्ते'],
    ['seva', 'सेवा'],
    ['mein', 'में'],
    ['hain', 'हैं'],
    ['main', 'मैं'],
    ['bhabhua', 'भभुआ'],
    ['kamal', 'कमल'],
    ['meri', 'मेरी'],
    ['ki', 'की'],
    ['nivedan', 'निवेदन'],
    ['raja', 'रजा'],
    ['raaja', 'राजा'],
    ['kaam', 'काम'],
    ['bus', 'बुस'],
    ['sinh', 'सिंह'],
    ['santosh', 'संतोश'],
    ['santoSh', 'संतोष'],
    ['lakshmee', 'लक्ष्मी'],
    ['gyaan', 'ज्ञान'],
    ['aap', 'आप'],
    ['ek', 'एक'],
    ['Namaste', 'नमस्ते'],
    ['kaTa', 'कटा'],
    ['Dillee', 'दिल्ली'],
  ])('%s → %s', (input, expected) => {
    expect(transliterateWord(input)).toBe(expected)
  })
})

describe('transliterateText', () => {
  it('converts Latin words and leaves numbers and punctuation alone', () => {
    expect(transliterateText('seva mein, 9:11 AM se BR24P8555')).toBe('सेवा में, 9:11 AM से BR24P8555')
  })

  it('turns | into a danda', () => {
    expect(transliterateText('dhanyavaad|')).toBe('धन्यवाद।')
  })
})

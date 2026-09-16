import { describe, expect, it } from 'vitest'
import { PAD_COLOR_IDS } from '../document/padColors'
import { TEMPLATES, TEMPLATE_LIST, isTemplateId } from './registry'

describe('template registry', () => {
  it('lists the bus booking template with bilingual names and routes', () => {
    expect(TEMPLATE_LIST.map((t) => t.id)).toEqual(['bus-booking'])
    const tpl = TEMPLATES['bus-booking']
    expect(tpl.name.en).toBeTruthy()
    expect(tpl.name.hi).toBeTruthy()
    expect(tpl.routes.start).toBe('/templates/bus-booking')
    expect(tpl.routes.edit('abc')).toBe('/bookings/abc')
    expect(tpl.routes.newWith('green')).toBe('/new?template=bus-booking&color=green')
  })

  it('produces fresh fields and sample content for every pad colour', () => {
    const tpl = TEMPLATES['bus-booking']
    expect(tpl.newFields().padColor).toBe(tpl.defaultPadColor)
    expect(tpl.newFields({ padColor: 'maroon' }).padColor).toBe('maroon')
    for (const color of PAD_COLOR_IDS) expect(tpl.sampleContent(color).padColor).toBe(color)
  })

  it('validates ids', () => {
    expect(isTemplateId('bus-booking')).toBe(true)
    expect(isTemplateId('invoice')).toBe(false)
  })
})

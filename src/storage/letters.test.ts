import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDb, type LetterDb } from './db'
import { lettersRepo, newLetterFields } from './letters'

let db: LetterDb
let repo: ReturnType<typeof lettersRepo>
let counter = 0

beforeEach(() => {
  db = createDb(`test-letters-${counter++}`)
  repo = lettersRepo(db)
})

afterEach(async () => {
  await db.delete()
})

describe('lettersRepo', () => {
  it('assigns sequential पत्रांक starting at 0001', async () => {
    const a = await repo.create()
    const b = await repo.create()
    expect(a.letterNo).toBe('0001')
    expect(b.letterNo).toBe('0002')
    expect(b.seq).toBe(2)
  })

  it('never reuses a number, even after deletion', async () => {
    const a = await repo.create()
    await repo.remove(a.id)
    const b = await repo.create()
    expect(b.letterNo).toBe('0002')
  })

  it('applies a stored prefix', async () => {
    await db.meta.put({ key: 'letterNoPrefix', value: 'SRBS/' })
    expect((await repo.create()).letterNo).toBe('SRBS/0001')
  })

  it('updates editable fields without touching identity', async () => {
    const rec = await repo.create()
    await repo.update(rec.id, { ...newLetterFields(), subject: 'समय-सारणी' })
    const loaded = await repo.get(rec.id)
    expect(loaded?.subject).toBe('समय-सारणी')
    expect(loaded?.letterNo).toBe(rec.letterNo)
    expect(loaded?.updatedAt).toBeGreaterThanOrEqual(rec.updatedAt)
  })

  it('rejects updates to unknown letters', async () => {
    await expect(repo.update('missing', newLetterFields())).rejects.toThrow()
  })

  it('lists newest first and searches across fields', async () => {
    const first = await repo.create({ ...newLetterFields(), subject: 'पहला पत्र' })
    const second = await repo.create({ ...newLetterFields(), recipient: 'सचिव महोदय, पटना' })
    await repo.update(second.id, { ...newLetterFields(), recipient: 'सचिव महोदय, पटना', body: 'निवेदन' })

    const all = await repo.list()
    expect(all.map((l) => l.id)).toEqual([second.id, first.id])
    expect((await repo.list('पहला')).map((l) => l.id)).toEqual([first.id])
    expect((await repo.list('पटना')).map((l) => l.id)).toEqual([second.id])
    expect((await repo.list('0001')).map((l) => l.id)).toEqual([first.id])
    expect(await repo.list('nothing')).toEqual([])
  })

  it('duplicates content into a new letter with a new number and today', async () => {
    const source = await repo.create({
      ...newLetterFields(),
      date: '2020-01-01',
      subject: 'विषय',
      body: 'मूल पाठ',
      page: { size: 'a4', orientation: 'landscape' },
    })
    const copy = await repo.duplicate(source.id)
    expect(copy.id).not.toBe(source.id)
    expect(copy.letterNo).toBe('0002')
    expect(copy.date).not.toBe('2020-01-01')
    expect(copy.subject).toBe('विषय')
    expect(copy.body).toBe('मूल पाठ')
    expect(copy.page).toEqual({ size: 'a4', orientation: 'landscape' })
  })
})

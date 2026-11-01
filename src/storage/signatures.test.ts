import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SignatureMark } from '../document/signature'
import { createDb, type AppDb } from './db'
import { setIssuer } from './issuer'
import { signaturesRepo } from './signatures'

let db: AppDb
let repo: ReturnType<typeof signaturesRepo>
let counter = 0

const typed: SignatureMark = { kind: 'typed', text: 'Sunil', font: 'great-vibes', ink: 'blue' }

beforeEach(() => {
  db = createDb(`test-signatures-${counter++}`)
  repo = signaturesRepo(db)
})

afterEach(async () => {
  setIssuer({ name: '' })
  await db.delete()
})

describe('signaturesRepo', () => {
  it('creates dirty rows, lists newest first and soft-deletes', async () => {
    const a = await repo.create('Sunil', typed)
    await db.signatures.update(a.id, { updatedAt: a.updatedAt - 10 })
    const b = await repo.create('Drawn signature', { kind: 'drawn', width: 300, height: 200, strokes: [[6, 6, 50, 50]], ink: 'black' })
    expect(a.dirty).toBe(1)
    expect((await repo.list()).map((s) => s.id)).toEqual([b.id, a.id])

    await repo.remove(a.id)
    expect((await repo.list()).map((s) => s.id)).toEqual([b.id])
    expect(await repo.get(a.id)).toBeUndefined()
    const removed = await db.signatures.get(a.id)
    expect(removed?.deletedAt).toBeTruthy()
    expect(removed?.dirty).toBe(1)
  })

  it('stamps the signed-in member and hides other members’ rows', async () => {
    setIssuer({ name: 'Sunil', userId: 'user-1' })
    const mine = await repo.create('Sunil', typed)
    expect(mine.createdBy).toBe('user-1')
    setIssuer({ name: '' })
    const unowned = await repo.create('Local', typed)
    await db.signatures.put({ ...mine, id: 'theirs', createdBy: 'user-2' })

    const ids = (await repo.list('user-1')).map((s) => s.id).sort()
    expect(ids).toEqual([mine.id, unowned.id].sort())
    expect(await repo.list()).toHaveLength(3) // signed out: everything on the device
  })
})

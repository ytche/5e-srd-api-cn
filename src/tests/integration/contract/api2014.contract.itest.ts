import { Application } from 'express'
import mongoose from 'mongoose'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { mongodbUri, redisClient } from '@/util'

let app: Application
let server: any

const resources = [
  'ability-scores',
  'alignments',
  'backgrounds',
  'classes',
  'conditions',
  'damage-types',
  'equipment-categories',
  'equipment',
  'feats',
  'features',
  'languages',
  'magic-items',
  'magic-schools',
  'monsters',
  'proficiencies',
  'races',
  'rules',
  'rule-sections',
  'skills',
  'spells',
  'subclasses',
  'subraces',
  'traits',
  'weapon-properties'
] as const

afterEach(() => {
  vi.clearAllMocks()
})

beforeAll(async () => {
  process.env.RATE_LIMIT_MAX = '10000'
  process.env.RATE_LIMIT_WINDOW_MS = '1000'

  await mongoose.connect(mongodbUri)
  await redisClient.connect()
  const createApp = (await import('@/server')).default
  app = await createApp()
  server = app.listen()
})

afterAll(async () => {
  await mongoose.disconnect()
  await redisClient.quit()
  server.close()
})

const expectListShape = (body: any) => {
  expect(body).toEqual(
    expect.objectContaining({
      count: expect.any(Number),
      results: expect.any(Array)
    })
  )
}

describe('API 2014 contract coverage', () => {
  it('returns 2014 index map', async () => {
    const res = await request(app).get('/api/2014')
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual(
      expect.objectContaining({
        classes: '/api/2014/classes',
        races: '/api/2014/races',
        spells: '/api/2014/spells'
      })
    )
  })

  describe('resource list + detail endpoints', () => {
    for (const resource of resources) {
      it(`covers /api/2014/${resource} and detail`, async () => {
        const listRes = await request(app).get(`/api/2014/${resource}`)
        expect(listRes.statusCode).toBe(200)
        expectListShape(listRes.body)

        const first = listRes.body.results[0]
        if (!first) return

        expect(first).toEqual(
          expect.objectContaining({
            index: expect.any(String),
            name: expect.any(String),
            url: expect.any(String)
          })
        )

        const detailRes = await request(app).get(`/api/2014/${resource}/${first.index}`)
        expect(detailRes.statusCode).toBe(200)
        expect(detailRes.body).toEqual(expect.objectContaining({ index: first.index }))
      })
    }
  })

  describe('class subresource endpoints', () => {
    const classIndex = 'wizard'

    it('covers subclasses', async () => {
      const res = await request(app).get(`/api/2014/classes/${classIndex}/subclasses`)
      expect(res.statusCode).toBe(200)
      expectListShape(res.body)
    })

    it('covers starting-equipment', async () => {
      const res = await request(app).get(`/api/2014/classes/${classIndex}/starting-equipment`)
      expect(res.statusCode).toBe(200)
      expect(res.body).toEqual(
        expect.objectContaining({
          starting_equipment: expect.any(Array),
          starting_equipment_options: expect.any(Array)
        })
      )
    })

    it('covers spellcasting', async () => {
      const res = await request(app).get(`/api/2014/classes/${classIndex}/spellcasting`)
      expect(res.statusCode).toBe(200)
      expect(res.body).toEqual(
        expect.objectContaining({
          level: expect.any(Number),
          spellcasting_ability: expect.any(Object),
          info: expect.any(Array)
        })
      )
    })

    it('covers spells', async () => {
      const res = await request(app).get(`/api/2014/classes/${classIndex}/spells`)
      expect(res.statusCode).toBe(200)
      expectListShape(res.body)
    })

    it('covers features', async () => {
      const res = await request(app).get(`/api/2014/classes/${classIndex}/features`)
      expect(res.statusCode).toBe(200)
      expectListShape(res.body)
    })

    it('covers proficiencies', async () => {
      const res = await request(app).get(`/api/2014/classes/${classIndex}/proficiencies`)
      expect(res.statusCode).toBe(200)
      expectListShape(res.body)
    })

    it('covers multi-classing', async () => {
      const res = await request(app).get(`/api/2014/classes/${classIndex}/multi-classing`)
      expect(res.statusCode).toBe(200)
      expect(res.body).toEqual(expect.any(Object))
    })

    it('covers levels + level details + level children', async () => {
      const levelsRes = await request(app).get(`/api/2014/classes/${classIndex}/levels`)
      expect(levelsRes.statusCode).toBe(200)
      expect(Array.isArray(levelsRes.body)).toBe(true)
      expect(levelsRes.body.length).toBeGreaterThan(0)

      const firstLevel = levelsRes.body[0]
      expect(firstLevel).toEqual(expect.objectContaining({ level: expect.any(Number) }))

      const level = firstLevel.level

      const levelRes = await request(app).get(`/api/2014/classes/${classIndex}/levels/${level}`)
      expect(levelRes.statusCode).toBe(200)
      expect(levelRes.body).toEqual(expect.objectContaining({ level }))

      const levelSpellsRes = await request(app).get(
        `/api/2014/classes/${classIndex}/levels/${level}/spells`
      )
      expect(levelSpellsRes.statusCode).toBe(200)
      expectListShape(levelSpellsRes.body)

      const levelFeaturesRes = await request(app).get(
        `/api/2014/classes/${classIndex}/levels/${level}/features`
      )
      expect(levelFeaturesRes.statusCode).toBe(200)
      expectListShape(levelFeaturesRes.body)
    })
  })

  describe('race subresource endpoints', () => {
    const raceIndex = 'elf'

    it('covers subraces', async () => {
      const res = await request(app).get(`/api/2014/races/${raceIndex}/subraces`)
      expect(res.statusCode).toBe(200)
      expectListShape(res.body)
    })

    it('covers proficiencies', async () => {
      const res = await request(app).get(`/api/2014/races/${raceIndex}/proficiencies`)
      expect(res.statusCode).toBe(200)
      expectListShape(res.body)
    })

    it('covers traits', async () => {
      const res = await request(app).get(`/api/2014/races/${raceIndex}/traits`)
      expect(res.statusCode).toBe(200)
      expectListShape(res.body)
    })
  })
})

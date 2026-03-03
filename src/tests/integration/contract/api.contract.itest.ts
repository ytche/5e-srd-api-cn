import { Application } from 'express'
import mongoose from 'mongoose'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import createApp from '@/server'
import { mongodbUri, redisClient } from '@/util'

let app: Application
let server: any

afterEach(() => {
  vi.clearAllMocks()
})

beforeAll(async () => {
  await mongoose.connect(mongodbUri)
  await redisClient.connect()
  app = await createApp()
  server = app.listen()
})

afterAll(async () => {
  await mongoose.disconnect()
  await redisClient.quit()
  server.close()
})

describe('integration contract: list response shape', () => {
  it('returns { count, results } for /api/2014/skills', async () => {
    const res = await request(app).get('/api/2014/skills')
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual(
      expect.objectContaining({
        count: expect.any(Number),
        results: expect.any(Array)
      })
    )
  })

  it('returns { count, results } for /api/2014/spells', async () => {
    const res = await request(app).get('/api/2014/spells')
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual(
      expect.objectContaining({
        count: expect.any(Number),
        results: expect.any(Array)
      })
    )
  })
})

describe('integration contract: 404 semantics', () => {
  it('returns JSON 404 for unknown route', async () => {
    const res = await request(app).get('/definitely-not-found')
    expect(res.statusCode).toBe(404)
    expect(res.body).toEqual({ error: 'Not found' })
  })

  it('returns JSON 404 when parent class does not exist', async () => {
    const res = await request(app).get('/api/2014/classes/nonexistent/starting-equipment')
    expect(res.statusCode).toBe(404)
    expect(res.body).toEqual({ error: 'Not found' })
  })
})

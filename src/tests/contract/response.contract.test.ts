import { createRequest, createResponse } from 'node-mocks-http'
import { describe, expect, it, vi } from 'vitest'

import * as RaceController from '@/controllers/api/2014/raceController'
import errorHandler from '@/middleware/errorHandler'
import notFoundHandler from '@/middleware/notFound'
import RaceModel from '@/models/2014/race'
import { raceFactory } from '@/tests/factories/2014/race.factory'
import { mockNext as defaultMockNext } from '@/tests/support'
import {
  generateUniqueDbUri,
  setupIsolatedDatabase,
  setupModelCleanup,
  teardownIsolatedDatabase
} from '@/tests/support/db'

const mockNext = vi.fn(defaultMockNext)

const dbUri = generateUniqueDbUri('contract_response')
setupIsolatedDatabase(dbUri)
teardownIsolatedDatabase()
setupModelCleanup(RaceModel)

describe('API contract responses', () => {
  it('returns list responses as { count, results }', async () => {
    await RaceModel.insertMany(raceFactory.buildList(2))
    const request = createRequest({ query: {} })
    const response = createResponse()

    await RaceController.index(request, response, mockNext)

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response._getData())).toEqual(
      expect.objectContaining({
        count: expect.any(Number),
        results: expect.any(Array)
      })
    )
  })

  it('returns JSON 404 body for not found routes', () => {
    const request = createRequest({ path: '/not-found' })
    const response = createResponse()

    notFoundHandler(request, response)

    expect(response.statusCode).toBe(404)
    expect(JSON.parse(response._getData())).toEqual({ error: 'Not found' })
  })

  it('returns 500 for untyped server errors', () => {
    const error = new Error('contract-test-error')
    const request = createRequest()
    const response = createResponse()

    errorHandler(error, request, response, mockNext)

    expect(response.statusCode).toBe(500)
    expect(JSON.parse(response._getData())).toEqual({ message: 'contract-test-error' })
  })
})

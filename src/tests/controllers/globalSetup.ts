import { MongoMemoryServer } from 'mongodb-memory-server'

// Define types for global variables
// Use declare global {} for augmenting the global scope safely
declare global {
  // eslint-disable-next-line no-var
  var __MONGOD__: MongoMemoryServer | undefined
}

const normalizeBaseMongoUri = (uri: string): string => {
  const withoutQuery = uri.trim().split('?')[0]
  if (withoutQuery.endsWith('/')) return withoutQuery

  const schemeSeparatorIndex = withoutQuery.indexOf('://')
  if (schemeSeparatorIndex === -1) return withoutQuery + '/'

  const hostStart = schemeSeparatorIndex + 3
  const lastSlashIndex = withoutQuery.lastIndexOf('/')

  // URI has no path component, append trailing slash as base URI.
  if (lastSlashIndex < hostStart) return withoutQuery + '/'

  // URI has a db path component (e.g. /5e-database), strip to host part.
  return withoutQuery.slice(0, lastSlashIndex + 1)
}

const resolveMongoBaseUri = (): string => {
  const preferredUri =
    process.env.TEST_MONGODB_URI_BASE ??
    process.env.TEST_MONGODB_URI ??
    process.env.MONGODB_URI ??
    'mongodb://127.0.0.1:27017/'

  return normalizeBaseMongoUri(preferredUri)
}

export async function setup(): Promise<() => Promise<void>> {
  console.log('\n[Global Setup - Unit Tests] Starting test servers...')

  if (process.env.USE_MONGODB_MEMORY_SERVER !== 'true') {
    const localMongoBaseUri = resolveMongoBaseUri()
    process.env.TEST_MONGODB_URI_BASE = localMongoBaseUri
    console.log(
      `[Global Setup - Unit Tests] Using MongoDB base URI from environment/local default: ${localMongoBaseUri}`
    )

    return async () => {
      console.log('\n[Global Teardown - Unit Tests] External MongoDB instance in use, nothing to stop.')
    }
  }

  // --- MongoMemoryServer fallback ---
  try {
    console.log('[Global Setup - Unit Tests] Starting MongoMemoryServer fallback...')
    const mongod = await MongoMemoryServer.create({
      instance: {
        ip: '127.0.0.1',
        port: Number(process.env.TEST_MONGODB_MEMORY_PORT ?? 27018)
      }
    })
    const baseMongoUri = mongod.getUri().split('?')[0]
    const serverUri = baseMongoUri.endsWith('/') ? baseMongoUri : baseMongoUri + '/'

    process.env.TEST_MONGODB_URI_BASE = serverUri // Set env var for tests
    globalThis.__MONGOD__ = mongod // Store instance globally
    console.log(`[Global Setup - Unit Tests] MongoMemoryServer started at base URI: ${serverUri}`)
  } catch (error) {
    console.error('[Global Setup - Unit Tests] Failed to start MongoMemoryServer:', error)
    throw new Error(
      `Failed to start MongoMemoryServer: ${error instanceof Error ? error.message : error}`
    )
  }

  console.log('[Global Setup - Unit Tests] MongoMemoryServer running.')

  // Return the teardown function
  return async () => {
    console.log('\n[Global Teardown - Unit Tests] Stopping test servers...')
    if (globalThis.__MONGOD__) {
      try {
        await globalThis.__MONGOD__.stop()
        console.log('[Global Teardown - Unit Tests] MongoMemoryServer stopped.')
      } catch (error) {
        console.error('[Global Teardown - Unit Tests] Error stopping MongoMemoryServer:', error)
      }
      globalThis.__MONGOD__ = undefined
    }
    console.log('[Global Teardown - Unit Tests] MongoMemoryServer stopped.')
  }
}

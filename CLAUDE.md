# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

D&D 5e SRD API — a Node.js/Express/TypeScript REST and GraphQL API serving D&D 5th Edition System Reference Document data. It supports two SRD versions (2014 and 2024) with bilingual Chinese/English content (`name`/`name_en`, `desc`/`desc_en`).

Backend stack: Express + Mongoose/Typegoose (MongoDB) + Redis + Apollo Server (TypeGraphQL).

## Common Commands

### Development

```bash
# Start MongoDB + Redis locally (required for dev/tests)
docker compose pull && docker compose up --build

# Dev server with auto-reload (builds on change)
npm run dev

# Full production build
npm run build

# TypeScript compile only
npm run build:ts
```

### Testing

```bash
# Unit tests (uses mongodb-memory-server or local MongoDB)
npm run test:unit

# Run a single test file
npx vitest run src/tests/controllers/simpleController.test.ts

# Watch mode for a single test file
npx vitest src/tests/controllers/simpleController.test.ts

# API contract tests
npm run test:contract

# Full API check (contract + unit)
npm run check:api

# Integration tests (runs inside Docker)
npm run test:integration:local
```

### Linting & Formatting

```bash
npm run lint
npm run lint:fix
```

### OpenAPI/Swagger

```bash
# Validate OpenAPI spec
npm run validate-swagger

# Bundle spec to dist/
npm run bundle-swagger

# Generate Postman collection
npm run gen-postman
```

## High-Level Architecture

### App Entry & Server

- `src/start.ts` — bootstraps MongoDB, Redis, cache prewarm, then starts Express.
- `src/server.ts` — builds the Express app: middleware, TypeGraphQL schemas, Apollo middleware, route registration.
- GraphQL endpoints: `/graphql/2014`, `/graphql/2024`, `/graphql` (deprecated alias to 2014).
- REST endpoints: `/api/2014`, `/api/2024`, `/api/images` (S3 proxy).

### REST API Structure

Routes → Controllers → Models. Versioned under `src/routes/api/2014/` and `src/routes/api/2024/`.

**Simple resources** (ability-scores, alignments, conditions, etc.) use `SimpleController` (`src/controllers/simpleController.ts`), which provides standard `index` (list) and `show` (detail) operations. Most route files just instantiate `new SimpleController(Model)`.

**Complex resources** (monsters, classes, spells, races, etc.) have custom controllers in `src/controllers/api/2014/` and `src/controllers/api/2024/` with additional endpoints like nested routes (`/classes/:index/levels`, `/monsters` with challenge_rating filter).

### Data Layer

Models are defined with **Typegoose** (`@typegoose/typegoose`) classes in `src/models/2014/` and `src/models/2024/`. These classes double as TypeGraphQL `@ObjectType` schemas.

Key patterns:
- `srdModelOptions(collectionName)` (`src/util/modelOptions.ts`) — sets the MongoDB collection name, disables `_id`, enables timestamps, and configures `toJSON`/`toObject` transforms to strip `_id`/`__v` recursively.
- `APIReference` (`src/models/common/apiReference.ts`) — standard reference shape (`index`, `name`, `url`) used across models for cross-resource links.
- Choice/Option pattern (`src/models/common/choice.ts`) — polymorphic option sets used for background starting equipment, class proficiencies, etc.

### GraphQL

Built with **TypeGraphQL** + Apollo Server. Resolvers live in `src/graphql/2014/resolvers/` and `src/graphql/2024/resolvers/`. Each resolver file typically exports a collection resolver (CRUD queries) and sometimes field resolvers for nested data resolution.

- `src/graphql/common/args.ts` — shared pagination, filtering, and sorting argument helpers (`BasePaginationArgs`, `BaseFilterArgs`, `buildSortPipeline`).
- `src/graphql/utils/resolvers.ts` — utilities for resolving `APIReference` arrays into full documents (`resolveMultipleReferences`, `resolveSingleReference`).

### Request Validation

Query/path parameters are validated with **Zod** schemas defined in `src/schemas/schemas.ts`. Controllers use `.safeParse()` and return 400 with `details` on failure.

### Caching

Redis is used selectively (e.g., `monsterController` caches `index` results by `req.originalUrl`). `src/util/RedisClient.ts` provides the client. Cache is flushed on startup (`start.ts` → `redisClient.flushAll()` → `prewarmCache()`).

### Image Serving

Monster images are streamed from S3 bucket `dnd-5e-api-images` via `src/controllers/api/imageController.ts`. Local testing requires LocalStack or real S3 credentials.

### Testing Architecture

- **Unit tests** (`src/tests/**/*.test.ts`): Vitest, `node-mocks-http` for Express req/res mocks, Fishery factories for test data.
- **Test DB isolation** (`src/tests/support/db.ts`): Each test suite calls `generateUniqueDbUri()` → `setupIsolatedDatabase()` → `teardownIsolatedDatabase()` → `setupModelCleanup(Model)` to get a unique MongoDB database per file.
- **Global setup** (`src/tests/controllers/globalSetup.ts`): Starts MongoMemoryServer if `USE_MONGODB_MEMORY_SERVER=true`, otherwise uses `TEST_MONGODB_URI_BASE`/`MONGODB_URI`.
- **Redis mocking** (`src/tests/vitest.setup.ts`): Redis client is globally mocked for unit tests.
- **Integration tests** (`src/tests/integration/**/*.itest.ts`): Run against real server + database inside Docker (`npm run test:integration:local`).
- **Contract tests** (`src/tests/contract/`): Verify API response shapes (e.g., `{ count, results }` lists, 404/500 error bodies).

### Project Conventions

- Path alias `@/` maps to `./src`.
- Imports are grouped and ordered by `import-x/order` ESLint rule: builtin → external → internal (`@/**`) → parent/sibling/index → object → type.
- Models use `!` suffix for required fields (e.g., `public name!: string`).
- URL paths use kebab-case (`ability-scores`, `equipment-categories`).
- Bilingual fields: `name`/`desc` are Chinese, `name_en`/`desc_en` are English.

### Important Documentation Files

- `docs/API_CONTRACT.md` — Data contract with the character-builder frontend (snake_case, bilingual fields, bare JSON responses).
- `docs/API_ZH.md` — Chinese API documentation.
- `src/swagger/README.md` — Working with the OpenAPI spec.

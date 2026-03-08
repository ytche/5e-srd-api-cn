#!/usr/bin/env node
/**
 * 拉取 5e-srd-api 的 2014 资源列表并保存为 JSON，便于与玩家手册条目对照。
 * 使用：BASE_URL=http://localhost:3000 node scripts/fetch-api-snapshot.mjs
 * 可选：OUT_DIR=./docs/api-snapshot node scripts/fetch-api-snapshot.mjs
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const OUT_DIR = process.env.OUT_DIR || 'docs/api-snapshot'
const fs = await import('fs')
const path = await import('path')

const resources = [
  'ability-scores', 'alignments', 'backgrounds', 'classes', 'conditions',
  'damage-types', 'equipment-categories', 'equipment', 'feats', 'languages',
  'magic-schools', 'proficiencies', 'races', 'skills', 'spells', 'subclasses',
  'subraces', 'weapon-properties'
]

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} ${res.status}`)
  return res.json()
}

async function main() {
  const dir = path.resolve(process.cwd(), OUT_DIR)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  const index = await fetchJson(`${BASE_URL}/api/2014`)
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(index, null, 2), 'utf8')
  console.log('Wrote index.json')

  for (const resource of resources) {
    const pathOrUrl = index[resource] || `/api/2014/${resource}`
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${BASE_URL}${pathOrUrl}`
    try {
      const data = await fetchJson(url)
      fs.writeFileSync(path.join(dir, `${resource}.json`), JSON.stringify(data, null, 2), 'utf8')
      const count = data.results?.length ?? data.count ?? 0
      console.log(`${resource}: ${count} items`)
    } catch (e) {
      console.error(`${resource}: ${e.message}`)
    }
  }
  console.log(`\nSnapshot written to ${dir}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

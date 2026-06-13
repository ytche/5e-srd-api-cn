#!/usr/bin/env node
/**
 * 从玩家手册 CHM 解压目录抽取法术/装备清单，与 API 快照对照，输出 3.3/3.4 用表格数据。
 * 用法：CHM_DIR=./5e_r_chm_extracted SNAPSHOT_DIR=./docs/api-snapshot node scripts/compare-spells-equipment.mjs
 * 可选：OUT_MD=./docs/DATA_GAP_SPELLS_EQUIPMENT.md 输出 Markdown 片段
 */
const fs = await import('fs')
const path = await import('path')

const CHM_DIR = path.resolve(process.cwd(), process.env.CHM_DIR || '5e_r_chm_extracted')
const PHB = path.join(CHM_DIR, '玩家手册')
const SNAPSHOT_DIR = process.env.SNAPSHOT_DIR ? path.resolve(process.cwd(), process.env.SNAPSHOT_DIR) : null
const OUT_MD = process.env.OUT_MD || null

const SPELL_LEVELS = ['戏法', '1环', '2环', '3环', '4环', '5环', '6环', '7环', '8环', '9环']
const EQUIPMENT_FILES = [
  { file: '武器.html', category: '武器' },
  { file: '护甲与盾牌.html', category: '护甲与盾牌' },
  { file: '冒险用品.html', category: '冒险用品' },
  { file: '工具.html', category: '工具' },
  { file: '其他开支.html', category: '其他开支' },
  { file: '坐骑与载具.htm', category: '坐骑与载具' },
  { file: '起始装备.htm', category: '起始装备' },
  { file: '饰品.htm', category: '饰品' },
  { file: '财富.htm', category: '财富' }
]

function extractSpells() {
  const byLevel = {}
  for (const level of SPELL_LEVELS) {
    const file = path.join(PHB, '魔法', '法术详述', level + '.html')
    if (!fs.existsSync(file)) continue
    const html = fs.readFileSync(file, 'utf8')
    const list = []
    let m
    const re = /<H4 id="([^"]+)">([^｜|]+)[｜|]([^<]+)<\/H4>/g
    while ((m = re.exec(html)) !== null) {
      list.push({ id: m[1], name_zh: m[2].trim(), name_en: m[3].trim() })
    }
    if (list.length === 0) {
      const re2 = /<H4 id="([^"]+)">[^<]*?([A-Za-z][A-Za-z\s\-'/]+?)<\/H4>/g
      while ((m = re2.exec(html)) !== null) {
        list.push({ id: m[1], name_zh: '', name_en: m[2].trim() })
      }
    }
    byLevel[level] = list
  }
  return byLevel
}

function toApiIndex(s) {
  return s.replace(/_/g, '-').toLowerCase()
}

function extractEquipment() {
  const byCategory = {}
  const eqDir = path.join(PHB, '装备')
  for (const { file, category } of EQUIPMENT_FILES) {
    const filePath = path.join(eqDir, file)
    if (!fs.existsSync(filePath)) continue
    const html = fs.readFileSync(filePath, 'utf8')
    const list = []
    const re = />([\u4e00-\u9fa5·]+)<\/span>\s*<span[^>]*lang=EN-US[^>]*>\s*([A-Za-z][A-Za-z'\s-]+?)<\/span>/g
    let m
    const seen = new Set()
    while ((m = re.exec(html)) !== null) {
      const zh = m[1].trim()
      const en = m[2].trim()
      if (en.length < 2 || en.length > 50) continue
      if (['Light', 'Heavy', 'Reach', 'Range', 'Special', 'Loading', 'Finesse', 'Ammunition', 'Thrown', 'Two-Handed', 'Versatile'].includes(en)) continue
      const key = zh + '|' + en
      if (seen.has(key)) continue
      seen.add(key)
      list.push({ name_zh: zh, name_en: en })
    }
    byCategory[category] = list
  }
  return byCategory
}

function loadSnapshot(name) {
  if (!SNAPSHOT_DIR || !fs.existsSync(SNAPSHOT_DIR)) return null
  const p = path.join(SNAPSHOT_DIR, name + '.json')
  if (!fs.existsSync(p)) return null
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function shuffle(arr, seed) {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = Math.floor((s / 233280) * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function main() {
  const spellsByLevel = extractSpells()
  const equipmentByCategory = extractEquipment()
  const spellsApi = loadSnapshot('spells')
  const equipmentApi = loadSnapshot('equipment')

  const apiSpellIndex = new Map()
  const apiSpellByNameEn = new Map()
  if (spellsApi?.results) {
    for (const r of spellsApi.results) {
      apiSpellIndex.set(r.index, r)
      if (r.name_en) apiSpellByNameEn.set(r.name_en.toLowerCase(), r)
      apiSpellByNameEn.set((r.name || '').toLowerCase(), r)
    }
  }

  const apiEquipByIndex = new Map()
  const apiEquipByNameEn = new Map()
  if (equipmentApi?.results) {
    for (const r of equipmentApi.results) {
      apiEquipByIndex.set(r.index, r)
      const en = (r.name_en || r.name || '').toLowerCase()
      if (en) apiEquipByNameEn.set(en, r)
    }
  }

  const spellMissing = []
  const spellRefine = []
  const SAMPLE = 10
  const SEED = 42

  for (const level of SPELL_LEVELS) {
    const list = spellsByLevel[level] || []
    if (list.length === 0) continue
    const sampled = list.length <= SAMPLE ? list : shuffle(list, SEED + level.length).slice(0, SAMPLE)
    let anyMissing = false
    for (const s of sampled) {
      const idx = toApiIndex(s.id)
      const inApi = apiSpellIndex.get(idx) || apiSpellByNameEn.get(s.name_en.toLowerCase())
      if (!inApi) {
        anyMissing = true
        break
      }
    }
    const checkList = anyMissing ? list : sampled
    for (const s of checkList) {
      const idx = toApiIndex(s.id)
      const inApi = apiSpellIndex.get(idx) || apiSpellByNameEn.get(s.name_en.toLowerCase())
      if (!inApi) spellMissing.push({ level, id: s.id, name_zh: s.name_zh, name_en: s.name_en })
      else if (inApi.name !== s.name_zh || (inApi.name_en && inApi.name_en !== s.name_en)) {
        spellRefine.push({ index: inApi.index, name_zh: s.name_zh, name_en: s.name_en, current: inApi.name, current_en: inApi.name_en })
      }
    }
  }

  const equipMissing = []
  const equipRefine = []
  for (const [category, list] of Object.entries(equipmentByCategory)) {
    if (list.length === 0) continue
    const sampled = list.length <= SAMPLE ? list : shuffle(list, SEED + category.length).slice(0, SAMPLE)
    let anyMissing = false
    for (const e of sampled) {
      const enKey = e.name_en.toLowerCase().replace(/'/g, '')
      const inApi = apiEquipByNameEn.get(e.name_en.toLowerCase()) || apiEquipByNameEn.get(enKey)
      if (!inApi) {
        anyMissing = true
        break
      }
    }
    const checkList = anyMissing ? list : sampled
    for (const e of checkList) {
      const inApi = apiEquipByNameEn.get(e.name_en.toLowerCase()) || apiEquipByNameEn.get(e.name_en.toLowerCase().replace(/'/g, ''))
      if (!inApi) equipMissing.push({ category, name_zh: e.name_zh, name_en: e.name_en })
      else if (inApi.name !== e.name_zh || (inApi.name_en && inApi.name_en !== e.name_en)) {
        equipRefine.push({ index: inApi.index, category, name_zh: e.name_zh, name_en: e.name_en, current: inApi.name, current_en: inApi.name_en })
      }
    }
  }

  const lines = []
  lines.push('## 3.3 法术 (spells)')
  lines.push('')
  lines.push('**抽查方法**：按环位（戏法、1环～9环）每环随机抽取 10 个法术与 API 对照；若该环位有缺失则对该环位全部法术进行对照。数据来源：`玩家手册/魔法/法术详述/*.html`（H4 id 与 中文｜英文 格式）。')
  lines.push('')
  lines.push('### 3.3.1 缺失条目（不全书有、库中无）')
  lines.push('')
  lines.push('| 环位 | API index（若有） | 不全书名称（中文｜英文） | 备注 |')
  lines.push('|------|------------------|--------------------------|------|')
  if (spellMissing.length === 0) {
    lines.push('| — | — | 抽样/全量对照后未发现缺失 | 以当前 API 快照为准 |')
  } else {
    for (const r of spellMissing) {
      const idx = toApiIndex(r.id)
      lines.push(`| ${r.level} | ${r.id}（或 ${idx}） | ${r.name_zh}｜${r.name_en} | 需补全 |`)
    }
  }
  lines.push('')
  lines.push('### 3.3.2 需完善内容（库中有，但 name/name_en 或描述与不全书不一致）')
  lines.push('')
  lines.push('| 资源类型 | API index | 当前情况 | 建议补充/修改 | 备注 |')
  lines.push('|----------|-----------|----------|---------------|------|')
  if (spellRefine.length === 0) {
    lines.push('| spells | — | 抽样/全量对照后未发现需修改项 | — | 可抽查 desc 等字段与不全书一致性 |')
  } else {
    for (const r of spellRefine) {
      lines.push(`| spells | ${r.index} | name=${r.current}${r.current_en ? `, name_en=${r.current_en}` : ''} | 建议 name=${r.name_zh}, name_en=${r.name_en} | 与不全书一致 |`)
    }
  }
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## 3.4 装备 (equipment)')
  lines.push('')
  lines.push('**抽查方法**：按玩家手册装备分类（武器、护甲与盾牌、冒险用品、工具、其他开支、坐骑与载具、起始装备、饰品、财富）每类随机抽取 10 个装备与 API 对照；若该分类有缺失则对该分类全部装备对照。数据来源：`玩家手册/装备/*.html` 表格中「名称/物品」列中英对照。')
  lines.push('')
  lines.push('### 3.4.1 缺失条目（不全书有、库中无）')
  lines.push('')
  lines.push('| 分类 | API index（若有） | 不全书名称（中文｜英文） | 备注 |')
  lines.push('|------|------------------|--------------------------|------|')
  if (equipMissing.length === 0) {
    lines.push('| — | — | 抽样/全量对照后未发现缺失 | 以当前 API 快照为准 |')
  } else {
    for (const r of equipMissing) {
      lines.push(`| ${r.category} | — | ${r.name_zh}｜${r.name_en} | 需补全 |`)
    }
  }
  lines.push('')
  lines.push('### 3.4.2 需完善内容（库中有，但 name/name_en 与不全书不一致）')
  lines.push('')
  lines.push('| 资源类型 | API index | 分类 | 当前情况 | 建议补充/修改 | 备注 |')
  lines.push('|----------|-----------|------|----------|---------------|------|')
  if (equipRefine.length === 0) {
    lines.push('| equipment | — | — | 抽样/全量对照后未发现需修改项 | — | 可抽查 desc、weight 等与不全书一致性 |')
  } else {
    for (const r of equipRefine) {
      lines.push(`| equipment | ${r.index} | ${r.category} | name=${r.current}${r.current_en ? `, name_en=${r.current_en}` : ''} | 建议 name=${r.name_zh}, name_en=${r.name_en} | 与不全书一致 |`)
    }
  }

  const out = lines.join('\n')
  if (OUT_MD) {
    fs.mkdirSync(path.dirname(OUT_MD), { recursive: true })
    fs.writeFileSync(OUT_MD, out, 'utf8')
    console.log('Wrote', OUT_MD)
  } else {
    console.log(out)
  }

  console.error('Spell missing:', spellMissing.length, 'Spell refine:', spellRefine.length)
  console.error('Equip missing:', equipMissing.length, 'Equip refine:', equipRefine.length)
}

main()

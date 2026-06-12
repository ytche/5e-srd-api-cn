#!/usr/bin/env node
/**
 * 从 5e 不全书 · 玩家手册 HTML 中抽取 PHB 背景的中文描述、特性与 personality 文本，
 * 并写入 2014-backgrounds 集合的 *_cn 字段（不破坏现有英文字段）。
 *
 * 使用方式：
 *   MONGODB_URI=mongodb://localhost/5e-database node scripts/seed-backgrounds-cn-from-html.mjs
 *
 * 约定写入字段（与 DATA_COMPLETION_PLAN_PLAYERS_HANDBOOK_CN.md 一致）：
 *   - desc_cn: string[]                      背景简介段落
 *   - starting_proficiencies_cn: string[]    技能熟练项（中文名列表）
 *   - languages_rule_cn: string              语言规则（整句）
 *   - starting_equipment_cn: string          装备行（整句）
 *   - feature.desc_cn: string[]              背景特性中文段落
 *   - personality_traits_cn: string[]        特点表格（右列中文句子）
 *   - ideals_cn: string[]                    理想表格
 *   - bonds_cn: string[]                     牵绊表格
 *   - flaws_cn: string[]                     缺点表格
 */

import path from 'node:path'
import fs from 'node:fs'
import mongoose from 'mongoose'
import iconv from 'iconv-lite'
import * as cheerio from 'cheerio'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost/5e-database'
const ROOT = path.resolve(process.cwd())
const PHB_ROOT = path.join(ROOT, '5e_r_chm_extracted', '玩家手册', '个性与背景')

const BACKGROUND_HTML_MAP = {
  'acolyte': '侍僧.html',
  'guild-artisan': '公会工匠.html',
  'outlander': '化外之民.html',
  'soldier': '士兵.html',
  'folk-hero': '平民英雄.html',
  'sage': '智者.html',
  'sailor': '水手.html',
  'urchin': '流浪儿.html',
  'criminal': '罪犯.html',
  'entertainer': '艺人.html',
  'noble': '贵族.html',
  'hermit': '隐士.html',
  'charlatan': '骗子.html'
}

function readHtmlGbk(filePath) {
  const buf = fs.readFileSync(filePath)
  return iconv.decode(buf, 'gbk')
}

function normalizeText(text) {
  return text.replace(/\s+/g, ' ').trim()
}

function extractBackgroundBlocks($) {
  const body = $('body')

  // 1. 顶部简介：标题之后直到出现“技能熟练项”之前的 <p>
  const descParas = []
  let sawTitle = false
  body.children().each((_, el) => {
    const tag = el.tagName?.toLowerCase()
    if (tag === 'p' || tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
      const text = normalizeText($(el).text())
      if (!text) return
      if (!sawTitle) {
        // 第一个包含中文背景名的标题视为开始
        if (text.includes('侍僧') || text.includes('公会工匠') || text.includes('化外之民') ||
            text.includes('士兵') || text.includes('平民英雄') || text.includes('智者') ||
            text.includes('水手') || text.includes('流浪儿') || text.includes('罪犯') ||
            text.includes('艺人') || text.includes('贵族') || text.includes('隐士') ||
            text.includes('骗子')) {
          sawTitle = true
        }
        return
      }
      // 遇到“技能熟练项”即结束简介段落收集
      if (text.startsWith('技能熟练项')) return false
      if (tag === 'p') {
        const pure = text.replace(/^·/, '').trim()
        if (pure) descParas.push(pure)
      }
    }
    return undefined
  })

  // 2. 技能 / 语言 / 装备行
  let skillsLine = ''
  let languagesLine = ''
  let equipmentLine = ''
  body.find('p').each((_, el) => {
    const text = normalizeText($(el).text())
    if (text.startsWith('技能熟练项')) skillsLine = text
    if (text.startsWith('语言')) languagesLine = text
    if (text.startsWith('装备')) equipmentLine = text
  })

  const skillsCn = skillsLine
    ? skillsLine.replace(/^技能熟练项[:：]\s*/, '').split(/[、，,]/).map((s) => s.trim()).filter(Boolean)
    : []

  const languagesRuleCn = languagesLine ? languagesLine.replace(/^语言[:：]\s*/, '').trim() : ''
  const equipmentCn = equipmentLine ? equipmentLine.replace(/^装备[:：]\s*/, '').trim() : ''

  // 3. 背景特性段落（特性：XXX 与 建议特征 之间的所有 <p>）
  const featureParas = []
  let inFeature = false
  body.find('h4, p').each((_, el) => {
    const tag = el.tagName?.toLowerCase()
    const text = normalizeText($(el).text())
    if (!text) return
    if (tag === 'h4' && text.includes('特性：')) {
      inFeature = true
      return
    }
    if (tag === 'h4' && text.includes('建议特征')) {
      inFeature = false
      return false
    }
    if (inFeature && tag === 'p') {
      featureParas.push(text)
    }
    return undefined
  })

  // 4. personality / ideals / bonds / flaws 四个表格
  const traits = []
  const ideals = []
  const bonds = []
  const flaws = []

  $('table.MsoNormalTable').each((_, table) => {
    const $table = $(table)
    const firstRowCells = $table.find('tr').first().find('td')
    if (firstRowCells.length < 2) return
    const headerText = normalizeText($(firstRowCells[1]).text() || '')
    const rows = $table.find('tr').slice(1) // 跳过表头

    if (headerText.includes('特点')) {
      rows.each((__, row) => {
        const tds = $(row).find('td')
        if (tds.length < 2) return
        const val = normalizeText($(tds[1]).text() || '')
        if (val) traits.push(val)
      })
    } else if (headerText.includes('理想')) {
      rows.each((__, row) => {
        const tds = $(row).find('td')
        if (tds.length < 2) return
        const val = normalizeText($(tds[1]).text() || '')
        if (val) ideals.push(val)
      })
    } else if (headerText.includes('牵绊')) {
      rows.each((__, row) => {
        const tds = $(row).find('td')
        if (tds.length < 2) return
        const val = normalizeText($(tds[1]).text() || '')
        if (val) bonds.push(val)
      })
    } else if (headerText.includes('缺点')) {
      rows.each((__, row) => {
        const tds = $(row).find('td')
        if (tds.length < 2) return
        const val = normalizeText($(tds[1]).text() || '')
        if (val) flaws.push(val)
      })
    }
  })

  return {
    desc_cn: descParas,
    starting_proficiencies_cn: skillsCn,
    languages_rule_cn: languagesRuleCn,
    starting_equipment_cn: equipmentCn,
    feature_desc_cn: featureParas,
    personality_traits_cn: traits,
    ideals_cn: ideals,
    bonds_cn: bonds,
    flaws_cn: flaws
  }
}

async function main() {
  console.log('Connecting to MongoDB:', MONGODB_URI)
  await mongoose.connect(MONGODB_URI)
  const db = mongoose.connection.db
  const backgroundsCol = db.collection('2014-backgrounds')
  const now = new Date().toISOString()

  for (const [index, fileName] of Object.entries(BACKGROUND_HTML_MAP)) {
    const filePath = path.join(PHB_ROOT, fileName)
    if (!fs.existsSync(filePath)) {
      console.warn('HTML not found for background', index, '->', filePath)
      continue
    }

    console.log('Processing background', index, 'from', filePath)
    const html = readHtmlGbk(filePath)
    const $ = cheerio.load(html)
    const blocks = extractBackgroundBlocks($)

    const update = {
      desc_cn: blocks.desc_cn,
      starting_proficiencies_cn: blocks.starting_proficiencies_cn,
      languages_rule_cn: blocks.languages_rule_cn,
      starting_equipment_cn: blocks.starting_equipment_cn,
      personality_traits_cn: blocks.personality_traits_cn,
      ideals_cn: blocks.ideals_cn,
      bonds_cn: blocks.bonds_cn,
      flaws_cn: blocks.flaws_cn,
      updated_at: now
    }

    // 同时将 feature.desc 覆盖为中文段落，并保留 desc_en 不变
    if (blocks.feature_desc_cn.length > 0) {
      update['feature.desc'] = blocks.feature_desc_cn
      update['feature.desc_cn'] = blocks.feature_desc_cn
    }

    const result = await backgroundsCol.updateOne({ index }, { $set: update })
    if (result.matchedCount === 0) {
      console.warn('Background not found in DB for index', index)
    } else if (result.modifiedCount) {
      console.log('Background updated:', index)
    } else {
      console.log('Background already up-to-date (no changes):', index)
    }
  }

  await mongoose.disconnect()
  console.log('Done seeding PHB background Chinese texts from HTML.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})


#!/usr/bin/env node
/**
 * 从 starting_proficiencies_cn + 术语表映射，补全 backgrounds.starting_proficiencies（APIReference[]）
 *
 * MONGODB_URI=mongodb://localhost/5e-database node scripts/seed-background-proficiencies-from-cn.mjs
 */

import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost/5e-database'

/** 中文技能名 → skill-{index}；含 PHB HTML 别名 */
const CN_TO_SKILL_INDEX = {
  运动: 'athletics',
  体操: 'acrobatics',
  特技: 'acrobatics',
  巧手: 'sleight-of-hand',
  隐匿: 'stealth',
  奥秘: 'arcana',
  历史: 'history',
  调查: 'investigation',
  自然: 'nature',
  宗教: 'religion',
  驯兽: 'animal-handling',
  洞悉: 'insight',
  医药: 'medicine',
  察觉: 'perception',
  生存: 'survival',
  欺瞒: 'deception',
  威吓: 'intimidation',
  表演: 'performance',
  游说: 'persuasion',
  说服: 'persuasion'
}

function buildProficiencyRef(prof) {
  const cnName = prof.name
  return {
    index: prof.index,
    name: cnName.startsWith('技能：') ? cnName : `技能：${cnName}`,
    name_en: prof.name_en || `Skill: ${prof.reference?.name_en || ''}`,
    url: prof.url || `/api/2014/proficiencies/${prof.index}`
  }
}

async function main() {
  console.log('Connecting to MongoDB:', MONGODB_URI)
  await mongoose.connect(MONGODB_URI)
  const db = mongoose.connection.db
  const backgroundsCol = db.collection('2014-backgrounds')
  const profCol = db.collection('2014-proficiencies')

  const profDocs = await profCol.find({ index: { $regex: /^skill-/ } }).toArray()
  const profByIndex = new Map(profDocs.map((p) => [p.index, p]))

  const backgrounds = await backgroundsCol.find({}).sort({ index: 1 }).toArray()

  for (const bg of backgrounds) {
    const cnList = bg.starting_proficiencies_cn
    if (!Array.isArray(cnList) || cnList.length === 0) {
      console.warn(`[skip] ${bg.index}: no starting_proficiencies_cn`)
      continue
    }

    const refs = []
    for (const cn of cnList) {
      const trimmed = String(cn).trim()
      const skillIndex = CN_TO_SKILL_INDEX[trimmed]
      if (!skillIndex) {
        throw new Error(`Unknown skill CN "${trimmed}" in background ${bg.index}`)
      }
      const profIndex = `skill-${skillIndex}`
      const prof = profByIndex.get(profIndex)
      if (!prof) {
        throw new Error(`Proficiency not found: ${profIndex} (background ${bg.index})`)
      }
      refs.push(buildProficiencyRef(prof))
    }

    const existing = bg.starting_proficiencies || []
    const same =
      existing.length === refs.length &&
      existing.every((e, i) => e.index === refs[i].index && e.name === refs[i].name)

    if (same) {
      console.log(`[ok] ${bg.index}: already up-to-date (${refs.length} proficiencies)`)
      continue
    }

    await backgroundsCol.updateOne({ index: bg.index }, { $set: { starting_proficiencies: refs } })
    console.log(
      `[updated] ${bg.index}: ${cnList.join(', ')} → ${refs.map((r) => r.index).join(', ')}`
    )
  }

  await mongoose.disconnect()
  console.log('Done seed-background-proficiencies-from-cn.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

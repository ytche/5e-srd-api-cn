#!/usr/bin/env node
/**
 * 填充 2014-backgrounds 集合的 starting_equipment 和 starting_equipment_options。
 * 基于 PHB 中文描述 + 数据库现有装备，为 12 个背景构造结构化装备数据。
 *
 * 使用方式：
 *   MONGODB_URI=mongodb://localhost/5e-database node scripts/seed-background-starting-equipment.mjs
 */

import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost/5e-database'

/**
 * 背景装备数据定义。
 * starting_equipment: 固定装备列表，每项为 { equipment_index, quantity }
 * starting_equipment_options: 选择装备列表，每项为 Choice 结构（支持 equipment_category 和 options_array）
 */
const BACKGROUND_DATA = {
  'guild-artisan': {
    starting_equipment: [
      { equipment_index: 'clothes-travelers', quantity: 1 },
      { equipment_index: 'pouch', quantity: 1 }
    ],
    starting_equipment_options: [
      {
        choose: 1,
        type: 'equipment',
        from: {
          option_set_type: 'equipment_category',
          equipment_category: { index: 'artisans-tools' }
        }
      }
    ]
  },
  hermit: {
    starting_equipment: [
      { equipment_index: 'case-map-or-scroll', quantity: 1 },
      { equipment_index: 'blanket', quantity: 1 },
      { equipment_index: 'clothes-common', quantity: 1 },
      { equipment_index: 'herbalism-kit', quantity: 1 },
      { equipment_index: 'pouch', quantity: 1 }
    ],
    starting_equipment_options: []
  },
  noble: {
    starting_equipment: [
      { equipment_index: 'clothes-fine', quantity: 1 },
      { equipment_index: 'signet-ring', quantity: 1 },
      { equipment_index: 'pouch', quantity: 1 }
    ],
    starting_equipment_options: []
  },
  outlander: {
    starting_equipment: [
      { equipment_index: 'staff', quantity: 1 },
      { equipment_index: 'hunting-trap', quantity: 1 },
      { equipment_index: 'clothes-travelers', quantity: 1 },
      { equipment_index: 'pouch', quantity: 1 }
    ],
    starting_equipment_options: []
  },
  sage: {
    starting_equipment: [
      { equipment_index: 'ink-1-ounce-bottle', quantity: 1 },
      { equipment_index: 'ink-pen', quantity: 1 },
      { equipment_index: 'small-knife', quantity: 1 },
      { equipment_index: 'clothes-common', quantity: 1 },
      { equipment_index: 'pouch', quantity: 1 }
    ],
    starting_equipment_options: []
  },
  sailor: {
    starting_equipment: [
      { equipment_index: 'club', quantity: 1 },
      { equipment_index: 'rope-silk-50-feet', quantity: 1 },
      { equipment_index: 'clothes-common', quantity: 1 },
      { equipment_index: 'pouch', quantity: 1 }
    ],
    starting_equipment_options: []
  },
  urchin: {
    starting_equipment: [
      { equipment_index: 'small-knife', quantity: 1 },
      { equipment_index: 'clothes-common', quantity: 1 },
      { equipment_index: 'pouch', quantity: 1 }
    ],
    starting_equipment_options: []
  },
  criminal: {
    starting_equipment: [
      { equipment_index: 'crowbar', quantity: 1 },
      { equipment_index: 'clothes-common', quantity: 1 },
      { equipment_index: 'pouch', quantity: 1 }
    ],
    starting_equipment_options: []
  },
  entertainer: {
    starting_equipment: [
      { equipment_index: 'clothes-costume', quantity: 1 },
      { equipment_index: 'pouch', quantity: 1 }
    ],
    starting_equipment_options: [
      {
        choose: 1,
        type: 'equipment',
        from: {
          option_set_type: 'equipment_category',
          equipment_category: { index: 'musical-instruments' }
        }
      }
    ]
  },
  'folk-hero': {
    starting_equipment: [
      { equipment_index: 'shovel', quantity: 1 },
      { equipment_index: 'pot-iron', quantity: 1 },
      { equipment_index: 'clothes-common', quantity: 1 },
      { equipment_index: 'pouch', quantity: 1 }
    ],
    starting_equipment_options: [
      {
        choose: 1,
        type: 'equipment',
        from: {
          option_set_type: 'equipment_category',
          equipment_category: { index: 'artisans-tools' }
        }
      }
    ]
  },
  charlatan: {
    starting_equipment: [
      { equipment_index: 'clothes-fine', quantity: 1 },
      { equipment_index: 'disguise-kit', quantity: 1 },
      { equipment_index: 'pouch', quantity: 1 }
    ],
    starting_equipment_options: []
  },
  soldier: {
    starting_equipment: [
      { equipment_index: 'clothes-common', quantity: 1 },
      { equipment_index: 'pouch', quantity: 1 }
    ],
    starting_equipment_options: [
      {
        choose: 1,
        type: 'equipment',
        from: {
          option_set_type: 'options_array',
          options: [
            {
              option_type: 'counted_reference',
              count: 1,
              of: { index: 'dice-set' }
            },
            {
              option_type: 'counted_reference',
              count: 1,
              of: { index: 'playing-card-set' }
            }
          ]
        }
      }
    ]
  }
}

// ---------------------------------------------------------------------------
// Helper: 构建 EquipmentRef
// ---------------------------------------------------------------------------
function buildEquipmentRef(equipmentIndex, quantity, equipByIndex) {
  const equip = equipByIndex.get(equipmentIndex)
  if (!equip) {
    throw new Error(`Equipment not found: ${equipmentIndex}`)
  }
  return {
    equipment: {
      index: equip.index,
      name: equip.name,
      url: equip.url || `/api/2014/equipment/${equip.index}`
    },
    quantity
  }
}

// ---------------------------------------------------------------------------
// Helper: 构建 Choice（支持 equipment_category 和 options_array）
// ---------------------------------------------------------------------------
function buildChoice(choice, equipByIndex, catByIndex) {
  const from = choice.from

  if (from.option_set_type === 'equipment_category') {
    const catIndex = from.equipment_category.index
    const cat = catByIndex.get(catIndex)
    if (!cat) {
      throw new Error(`Equipment category not found: ${catIndex}`)
    }
    return {
      choose: choice.choose,
      type: choice.type,
      from: {
        option_set_type: 'equipment_category',
        equipment_category: {
          index: cat.index,
          name: cat.name,
          url: cat.url || `/api/2014/equipment-categories/${cat.index}`
        }
      }
    }
  }

  if (from.option_set_type === 'options_array') {
    return {
      choose: choice.choose,
      type: choice.type,
      from: {
        option_set_type: 'options_array',
        options: from.options.map((opt) => buildOption(opt, equipByIndex, catByIndex))
      }
    }
  }

  throw new Error(`Unsupported option_set_type: ${from.option_set_type}`)
}

// ---------------------------------------------------------------------------
// Helper: 构建 Option（支持 counted_reference）
// ---------------------------------------------------------------------------
function buildOption(option, equipByIndex, catByIndex) {
  if (option.option_type === 'counted_reference') {
    const equip = equipByIndex.get(option.of.index)
    if (!equip) {
      throw new Error(`Equipment not found for counted_reference: ${option.of.index}`)
    }
    return {
      option_type: 'counted_reference',
      count: option.count,
      of: {
        index: equip.index,
        name: equip.name,
        url: equip.url || `/api/2014/equipment/${equip.index}`
      }
    }
  }

  if (option.option_type === 'choice') {
    return {
      option_type: 'choice',
      choice: buildChoice(option.choice, equipByIndex, catByIndex)
    }
  }

  throw new Error(`Unsupported option_type: ${option.option_type}`)
}

// ---------------------------------------------------------------------------
// Helper: 深度比较两个对象是否相同（用于判断是否需要更新）
// ---------------------------------------------------------------------------
function isSame(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('Connecting to MongoDB:', MONGODB_URI)
  await mongoose.connect(MONGODB_URI)
  const db = mongoose.connection.db
  const backgroundsCol = db.collection('2014-backgrounds')
  const equipmentCol = db.collection('2014-equipment')
  const categoriesCol = db.collection('2014-equipment-categories')
  const now = new Date().toISOString()

  // 加载装备和分类数据
  const equipDocs = await equipmentCol.find({}).toArray()
  const equipByIndex = new Map(equipDocs.map((e) => [e.index, e]))

  const catDocs = await categoriesCol.find({}).toArray()
  const catByIndex = new Map(catDocs.map((c) => [c.index, c]))

  console.log(`Loaded ${equipDocs.length} equipment items, ${catDocs.length} categories`)

  // 校验所有引用
  for (const [bgIndex, data] of Object.entries(BACKGROUND_DATA)) {
    for (const ref of data.starting_equipment) {
      if (!equipByIndex.has(ref.equipment_index)) {
        throw new Error(`[${bgIndex}] Unknown equipment index: ${ref.equipment_index}`)
      }
    }
    for (const opt of data.starting_equipment_options) {
      // 通过 buildChoice 做间接校验
      buildChoice(opt, equipByIndex, catByIndex)
    }
  }
  console.log('All references validated.')

  // 构建并更新每个背景
  for (const [bgIndex, data] of Object.entries(BACKGROUND_DATA)) {
    const starting_equipment = data.starting_equipment.map((ref) =>
      buildEquipmentRef(ref.equipment_index, ref.quantity, equipByIndex)
    )

    const starting_equipment_options = data.starting_equipment_options.map((opt) =>
      buildChoice(opt, equipByIndex, catByIndex)
    )

    const update = {
      starting_equipment,
      starting_equipment_options,
      updated_at: now
    }

    const existing = await backgroundsCol.findOne({ index: bgIndex })
    if (!existing) {
      console.warn(`[skip] ${bgIndex}: not found in database`)
      continue
    }

    const same =
      isSame(existing.starting_equipment, starting_equipment) &&
      isSame(existing.starting_equipment_options, starting_equipment_options)

    if (same) {
      console.log(`[ok] ${bgIndex}: already up-to-date`)
      continue
    }

    const result = await backgroundsCol.updateOne({ index: bgIndex }, { $set: update })
    if (result.modifiedCount) {
      console.log(
        `[updated] ${bgIndex}: ${starting_equipment.length} equipment, ${starting_equipment_options.length} options`
      )
    } else {
      console.warn(`[warn] ${bgIndex}: no changes applied`)
    }
  }

  await mongoose.disconnect()
  console.log('Done seed-background-starting-equipment.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

#!/usr/bin/env node
/**
 * 按 DATA_GAP_PLAYERS_HANDBOOK.md 3.1 补充缺失的 subraces/subclasses/backgrounds/feats，
 * 并按 3.2 更新子职业 name/name_en。
 * 使用：MONGODB_URI=mongodb://localhost/5e-database node scripts/seed-data-gap.mjs
 */

import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost/5e-database'
const now = new Date().toISOString()

const abilityRef = (index, name) => ({
  index,
  name: name || index.toUpperCase(),
  url: `/api/2014/ability-scores/${index}`
})

const raceRef = (index, name, nameEn) => ({
  index,
  name,
  name_en: nameEn || undefined,
  url: `/api/2014/races/${index}`
})

const classRef = (index, name, nameEn) => ({
  index,
  name,
  name_en: nameEn || undefined,
  url: `/api/2014/classes/${index}`
})

async function main() {
  await mongoose.connect(MONGODB_URI)
  const db = mongoose.connection.db

  // ---------- 3.1 补充缺失 ----------

  // Subraces (5)
  const subracesCol = db.collection('2014-subraces')
  const subracesToAdd = [
    {
      index: 'wood-elf',
      name: '木精灵',
      name_en: 'Wood Elf',
      race: raceRef('elf', '精灵', 'Elf'),
      desc: '木精灵在森林中习得了隐秘与敏捷。',
      desc_en: 'Wood elves learn stealth and swiftness in the forests.',
      ability_bonuses: [{ ability_score: abilityRef('dex', '敏捷'), bonus: 2 }],
      racial_traits: [],
      url: '/api/2014/subraces/wood-elf',
      updated_at: now
    },
    {
      index: 'drow',
      name: '卓尔',
      name_en: 'Drow',
      race: raceRef('elf', '精灵', 'Elf'),
      desc: '卓尔又称黑暗精灵，居于幽暗地域。',
      desc_en: 'The drow, or dark elves, dwell in the Underdark.',
      ability_bonuses: [{ ability_score: abilityRef('cha', '魅力'), bonus: 1 }],
      racial_traits: [],
      url: '/api/2014/subraces/drow',
      updated_at: now
    },
    {
      index: 'mountain-dwarf',
      name: '高山矮人',
      name_en: 'Mountain Dwarf',
      race: raceRef('dwarf', '矮人', 'Dwarf'),
      desc: '高山矮人强壮且精于护甲锻造。',
      desc_en: 'Mountain dwarves are strong and skilled with armor.',
      ability_bonuses: [
        { ability_score: abilityRef('str', '力量'), bonus: 2 },
        { ability_score: abilityRef('con', '体质'), bonus: 2 }
      ],
      racial_traits: [],
      url: '/api/2014/subraces/mountain-dwarf',
      updated_at: now
    },
    {
      index: 'forest-gnome',
      name: '森林侏儒',
      name_en: 'Forest Gnome',
      race: raceRef('gnome', '侏儒', 'Gnome'),
      desc: '森林侏儒善于与动物交流并掌握幻术戏法。',
      desc_en: 'Forest gnomes speak with small animals and know minor illusion.',
      ability_bonuses: [{ ability_score: abilityRef('int', '智力'), bonus: 2 }],
      racial_traits: [],
      url: '/api/2014/subraces/forest-gnome',
      updated_at: now
    },
    {
      index: 'stout-halfling',
      name: '壮硕半身人',
      name_en: 'Stout Halfling',
      race: raceRef('halfling', '半身人', 'Halfling'),
      desc: '壮硕半身人具有矮人血统，对毒素有抗性。',
      desc_en: 'Stout halflings have dwarven blood and resist poison.',
      ability_bonuses: [{ ability_score: abilityRef('dex', '敏捷'), bonus: 2 }],
      racial_traits: [],
      url: '/api/2014/subraces/stout-halfling',
      updated_at: now
    }
  ]
  for (const doc of subracesToAdd) {
    const existing = await subracesCol.findOne({ index: doc.index })
    if (!existing) {
      await subracesCol.insertOne(doc)
      console.log('subrace inserted:', doc.index)
    }
  }

  // Subclasses: 需补充的 SRD index 与 中文/英文 名
  const subclassesCol = db.collection('2014-subclasses')
  const subclassesToAdd = [
    { index: 'totem-warrior', class: classRef('barbarian', '野蛮人', 'Barbarian'), name: '图腾武者道途', name_en: 'Path of the Totem Warrior', subclass_flavor: '原始道途' },
    { index: 'college-of-valor', class: classRef('bard', '吟游诗人', 'Bard'), name: '勇气学院', name_en: 'College of Valor', subclass_flavor: '学院' },
    { index: 'knowledge', class: classRef('cleric', '牧师', 'Cleric'), name: '知识领域', name_en: 'Knowledge Domain', subclass_flavor: '领域' },
    { index: 'light', class: classRef('cleric', '牧师', 'Cleric'), name: '光明领域', name_en: 'Light Domain', subclass_flavor: '领域' },
    { index: 'tempest', class: classRef('cleric', '牧师', 'Cleric'), name: '风暴领域', name_en: 'Tempest Domain', subclass_flavor: '领域' },
    { index: 'war', class: classRef('cleric', '牧师', 'Cleric'), name: '战争领域', name_en: 'War Domain', subclass_flavor: '领域' },
    { index: 'trickery', class: classRef('cleric', '牧师', 'Cleric'), name: '诡术领域', name_en: 'Trickery Domain', subclass_flavor: '领域' },
    { index: 'nature', class: classRef('cleric', '牧师', 'Cleric'), name: '自然领域', name_en: 'Nature Domain', subclass_flavor: '领域' },
    { index: 'circle-of-the-moon', class: classRef('druid', '德鲁伊', 'Druid'), name: '月亮结社', name_en: 'Circle of the Moon', subclass_flavor: '结社' },
    { index: 'battle-master', class: classRef('fighter', '战士', 'Fighter'), name: '战斗大师', name_en: 'Battle Master', subclass_flavor: '战斗风格' },
    { index: 'eldritch-knight', class: classRef('fighter', '战士', 'Fighter'), name: '奥法骑士', name_en: 'Eldritch Knight', subclass_flavor: '战斗风格' },
    { index: 'way-of-shadow', class: classRef('monk', '武僧', 'Monk'), name: '暗影宗', name_en: 'Way of Shadow', subclass_flavor: '武艺宗派' },
    { index: 'way-of-the-four-elements', class: classRef('monk', '武僧', 'Monk'), name: '四象宗', name_en: 'Way of the Four Elements', subclass_flavor: '武艺宗派' },
    { index: 'oath-of-vengeance', class: classRef('paladin', '圣武士', 'Paladin'), name: '复仇之誓', name_en: 'Oath of Vengeance', subclass_flavor: '圣誓' },
    { index: 'oath-of-the-ancients', class: classRef('paladin', '圣武士', 'Paladin'), name: '古贤之誓', name_en: 'Oath of the Ancients', subclass_flavor: '圣誓' },
    { index: 'beast-master', class: classRef('ranger', '游侠', 'Ranger'), name: '驯兽师', name_en: 'Beast Master', subclass_flavor: '游侠道途' },
    { index: 'assassin', class: classRef('rogue', '游荡者', 'Rogue'), name: '刺客', name_en: 'Assassin', subclass_flavor: ' roguish archetype' },
    { index: 'mastermind', class: classRef('rogue', '游荡者', 'Rogue'), name: '诡术师', name_en: 'Mastermind', subclass_flavor: ' roguish archetype' },
    { index: 'wild-magic', class: classRef('sorcerer', '术士', 'Sorcerer'), name: '狂野魔法', name_en: 'Wild Magic', subclass_flavor: '血脉' },
    { index: 'archfey', class: classRef('warlock', '邪术师', 'Warlock'), name: '至高妖精', name_en: 'The Archfey', subclass_flavor: '宗主' },
    { index: 'great-old-one', class: classRef('warlock', '邪术师', 'Warlock'), name: '旧日支配者', name_en: 'The Great Old One', subclass_flavor: '宗主' },
    { index: 'abjuration', class: classRef('wizard', '法师', 'Wizard'), name: '防护学派', name_en: 'School of Abjuration', subclass_flavor: '学派' },
    { index: 'conjuration', class: classRef('wizard', '法师', 'Wizard'), name: '咒法学派', name_en: 'School of Conjuration', subclass_flavor: '学派' },
    { index: 'divination', class: classRef('wizard', '法师', 'Wizard'), name: '预言学派', name_en: 'School of Divination', subclass_flavor: '学派' },
    { index: 'enchantment', class: classRef('wizard', '法师', 'Wizard'), name: '惑控学派', name_en: 'School of Enchantment', subclass_flavor: '学派' },
    { index: 'illusion', class: classRef('wizard', '法师', 'Wizard'), name: '幻术学派', name_en: 'School of Illusion', subclass_flavor: '学派' },
    { index: 'necromancy', class: classRef('wizard', '法师', 'Wizard'), name: '死灵学派', name_en: 'School of Necromancy', subclass_flavor: '学派' },
    { index: 'transmutation', class: classRef('wizard', '法师', 'Wizard'), name: '变化学派', name_en: 'School of Transmutation', subclass_flavor: '学派' }
  ]
  for (const row of subclassesToAdd) {
    const existing = await subclassesCol.findOne({ index: row.index })
    if (!existing) {
      await subclassesCol.insertOne({
        index: row.index,
        class: row.class,
        name: row.name,
        name_en: row.name_en,
        subclass_flavor: row.subclass_flavor,
        desc: ['详见玩家手册。'],
        desc_en: ['See Player\'s Handbook.'],
        subclass_levels: `/api/2014/subclasses/${row.index}/levels`,
        url: `/api/2014/subclasses/${row.index}`,
        updated_at: now,
        spells: []
      })
      console.log('subclass inserted:', row.index)
    }
  }

  // Backgrounds (12 missing; acolyte exists)
  const backgroundsCol = db.collection('2014-backgrounds')
  const emptyChoice = { choose: 0, type: 'options_array', from: { option_set_type: 'options_array', options: [] } }
  const backgroundsToAdd = [
    { index: 'guild-artisan', name: '公会工匠', name_en: 'Guild Artisan' },
    { index: 'hermit', name: '隐士', name_en: 'Hermit' },
    { index: 'noble', name: '贵族', name_en: 'Noble' },
    { index: 'outlander', name: '化外之民', name_en: 'Outlander' },
    { index: 'sage', name: '智者', name_en: 'Sage' },
    { index: 'sailor', name: '水手', name_en: 'Sailor' },
    { index: 'soldier', name: '士兵', name_en: 'Soldier' },
    { index: 'urchin', name: '流浪儿', name_en: 'Urchin' },
    { index: 'criminal', name: '罪犯', name_en: 'Criminal' },
    { index: 'entertainer', name: '艺人', name_en: 'Entertainer' },
    { index: 'folk-hero', name: '平民英雄', name_en: 'Folk Hero' },
    { index: 'charlatan', name: '骗子', name_en: 'Charlatan' }
  ]
  for (const row of backgroundsToAdd) {
    const existing = await backgroundsCol.findOne({ index: row.index })
    if (!existing) {
      await backgroundsCol.insertOne({
        index: row.index,
        name: row.name,
        name_en: row.name_en,
        starting_proficiencies: [],
        language_options: emptyChoice,
        starting_equipment: [],
        starting_equipment_options: [],
        feature: {
          name: row.name + '特性',
          name_en: row.name_en + ' Feature',
          desc: ['详见玩家手册。'],
          desc_en: ['See Player\'s Handbook.']
        },
        personality_traits: emptyChoice,
        ideals: emptyChoice,
        bonds: emptyChoice,
        flaws: emptyChoice,
        url: `/api/2014/backgrounds/${row.index}`,
        updated_at: now
      })
      console.log('background inserted:', row.index)
    }
  }

  // Feats (SRD 核心专长，除 grappler 外)
  const featsCol = db.collection('2014-feats')
  const featsToAdd = [
    { index: 'alert', name: '警觉', name_en: 'Alert' },
    { index: 'actor', name: '演员', name_en: 'Actor' },
    { index: 'charger', name: '冲锋手', name_en: 'Charger' },
    { index: 'defensive-duelist', name: '防御型决斗者', name_en: 'Defensive Duelist' },
    { index: 'dual-wielder', name: '双持客', name_en: 'Dual Wielder' },
    { index: 'dungeon-delver', name: '地城探险家', name_en: 'Dungeon Delver' },
    { index: 'durable', name: '坚韧', name_en: 'Durable' },
    { index: 'elemental-adept', name: '元素熟稔', name_en: 'Elemental Adept' },
    { index: 'great-weapon-master', name: '巨武器大师', name_en: 'Great Weapon Master' },
    { index: 'healer', name: '医者', name_en: 'Healer' },
    { index: 'heavily-armored', name: '重甲熟稔', name_en: 'Heavily Armored' },
    { index: 'heavy-armor-master', name: '重甲大师', name_en: 'Heavy Armor Master' },
    { index: 'inspiring-leader', name: '激励领袖', name_en: 'Inspiring Leader' },
    { index: 'keen-mind', name: '敏锐心灵', name_en: 'Keen Mind' },
    { index: 'lightly-armored', name: '轻甲熟稔', name_en: 'Lightly Armored' },
    { index: 'linguist', name: '语言学家', name_en: 'Linguist' },
    { index: 'lucky', name: '幸运', name_en: 'Lucky' },
    { index: 'mage-slayer', name: '屠法者', name_en: 'Mage Slayer' },
    { index: 'magic-initiate', name: '魔法启蒙', name_en: 'Magic Initiate' },
    { index: 'martial-adept', name: '战技专家', name_en: 'Martial Adept' },
    { index: 'medium-armor-master', name: '中甲大师', name_en: 'Medium Armor Master' },
    { index: 'mobile', name: '灵活', name_en: 'Mobile' },
    { index: 'mounted-combatant', name: '骑乘战技', name_en: 'Mounted Combatant' },
    { index: 'observant', name: '观察力', name_en: 'Observant' },
    { index: 'resilient', name: '坚毅', name_en: 'Resilient' },
    { index: 'ritual-caster', name: '仪式施法者', name_en: 'Ritual Caster' },
    { index: 'savage-attacker', name: '凶蛮攻击者', name_en: 'Savage Attacker' },
    { index: 'sentinel', name: '哨兵', name_en: 'Sentinel' },
    { index: 'sharpshooter', name: '神射手', name_en: 'Sharpshooter' },
    { index: 'shield-master', name: '盾牌大师', name_en: 'Shield Master' },
    { index: 'skilled', name: '多才多艺', name_en: 'Skilled' },
    { index: 'skulker', name: '潜行客', name_en: 'Skulker' },
    { index: 'spell-sniper', name: '法术狙击', name_en: 'Spell Sniper' },
    { index: 'tavern-brawler', name: '酒馆斗殴者', name_en: 'Tavern Brawler' },
    { index: 'tough', name: '健壮', name_en: 'Tough' },
    { index: 'war-caster', name: '战地施法者', name_en: 'War Caster' },
    { index: 'weapon-master', name: '武器大师', name_en: 'Weapon Master' }
  ]
  for (const row of featsToAdd) {
    const existing = await featsCol.findOne({ index: row.index })
    if (!existing) {
      await featsCol.insertOne({
        index: row.index,
        name: row.name,
        name_en: row.name_en,
        prerequisites: [],
        desc: ['详见玩家手册。'],
        desc_en: ['See Player\'s Handbook.'],
        url: `/api/2014/feats/${row.index}`,
        updated_at: now
      })
      console.log('feat inserted:', row.index)
    }
  }

  // ---------- 3.2 更新子职业 name / name_en ----------
  const subclassUpdates = [
    { index: 'devotion', name: '奉献之誓', name_en: 'Oath of Devotion' },
    { index: 'draconic', name: '龙族血脉', name_en: 'Draconic Bloodline' },
    { index: 'land', name: '大地结社', name_en: 'Circle of the Land' },
    { index: 'lore', name: '逸闻学院', name_en: 'College of Lore' },
    { index: 'hunter', name: '猎人', name_en: 'Hunter' },
    { index: 'open-hand', name: '散打宗', name_en: 'Way of the Open Hand' },
    { index: 'evocation', name: '塑能学派', name_en: 'School of Evocation' },
    { index: 'life', name: '生命领域', name_en: 'Life Domain' },
    { index: 'berserker', name: '狂战士道途', name_en: 'Path of the Berserker' }
  ]
  for (const u of subclassUpdates) {
    const r = await subclassesCol.updateOne(
      { index: u.index },
      { $set: { name: u.name, name_en: u.name_en, updated_at: now } }
    )
    if (r.modifiedCount) console.log('subclass updated:', u.index, '->', u.name)
  }

  await mongoose.disconnect()
  console.log('Seed and updates done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

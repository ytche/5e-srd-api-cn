#!/usr/bin/env node
/**
 * 从 CHM 提取的 HTML 中解析子职业描述，生成预览
 * 使用：node scripts/preview-subclass-desc.mjs
 */
import fs from 'fs'
import path from 'path'
import iconv from 'iconv-lite'
import * as cheerio from 'cheerio'

const CHM_BASE = path.resolve('5e_r_chm_extracted/玩家手册/职业')

const subclassMap = [
  { index: 'totem-warrior', file: '野蛮人/图腾武者道途.html', class: 'barbarian', titlePattern: /图腾武者道途\s*Path of the Totem Warrior/ },
  { index: 'college-of-valor', file: '吟游诗人/勇气学院.html', class: 'bard', titlePattern: /勇气学院\s*College of Valor/ },
  { index: 'knowledge', file: '牧师/知识领域.html', class: 'cleric', titlePattern: /知识领域\s*Knowledge Domain/ },
  { index: 'light', file: '牧师/光明领域.html', class: 'cleric', titlePattern: /光明领域\s*Light Domain/ },
  { index: 'tempest', file: '牧师/风暴领域.html', class: 'cleric', titlePattern: /风暴领域\s*Tempest Domai/ },
  { index: 'war', file: '牧师/战争领域.html', class: 'cleric', titlePattern: /战争领域\s*War Domain/ },
  { index: 'trickery', file: '牧师/诡术领域.html', class: 'cleric', titlePattern: /诡术领域\s*Trickery Domain/ },
  { index: 'nature', file: '牧师/自然领域.html', class: 'cleric', titlePattern: /自然领域\s*Nature Domain/ },
  { index: 'circle-of-the-moon', file: '德鲁伊/月亮结社.html', class: 'druid', titlePattern: /月亮结社\s*Circle of the Moon/ },
  { index: 'battle-master', file: '战士/战斗大师.html', class: 'fighter', titlePattern: /战斗大师\s*Battle Master/ },
  { index: 'eldritch-knight', file: '战士/奥法骑士.html', class: 'fighter', titlePattern: /奥法骑士\s*Eldritch Knight/ },
  { index: 'way-of-shadow', file: '武僧/暗影宗.html', class: 'monk', titlePattern: /暗影宗\s*Way of Shadow/ },
  { index: 'way-of-the-four-elements', file: '武僧/四象宗.html', class: 'monk', titlePattern: /四象宗\s*Way of the Four Elements/ },
  { index: 'oath-of-vengeance', file: '圣武士/复仇之誓.html', class: 'paladin', titlePattern: /复仇之誓\s*Oath of Vengeance/ },
  { index: 'oath-of-the-ancients', file: '圣武士/古贤之誓.html', class: 'paladin', titlePattern: /古贤之誓\s*Oath of the Ancients/ },
  { index: 'beast-master', file: '游侠/驯兽师.html', class: 'ranger', titlePattern: /驯兽师\s*Beast Master/ },
  { index: 'assassin', file: '游荡者/刺客.html', class: 'rogue', titlePattern: /刺客\s*Assassin/ },
  { index: 'mastermind', file: '游荡者/诡术师.html', class: 'rogue', titlePattern: /诡术师\s*Mastermind/ },
  { index: 'wild-magic', file: '术士/狂野魔法.html', class: 'sorcerer', titlePattern: /狂野魔法\s*Wild Magic/ },
  { index: 'archfey', file: '邪术师/至高妖精.html', class: 'warlock', titlePattern: /至高妖精\s*The Archfey/ },
  { index: 'great-old-one', file: '邪术师/旧日支配者.html', class: 'warlock', titlePattern: /旧日支配者\s*The Great Old One/ },
  { index: 'abjuration', file: '法师/防护学派.html', class: 'wizard', titlePattern: /防护学派\s*School of Abjuration/ },
  { index: 'conjuration', file: '法师/咒法学派.html', class: 'wizard', titlePattern: /咒法学派\s*School of Conjuration/ },
  { index: 'divination', file: '法师/预言学派.html', class: 'wizard', titlePattern: /预言学派\s*School of Divination/ },
  { index: 'enchantment', file: '法师/惑控学派.html', class: 'wizard', titlePattern: /惑控学派\s*School of Enchantment/ },
  { index: 'illusion', file: '法师/幻术学派.html', class: 'wizard', titlePattern: /幻术学派\s*School of Illusion/ },
  { index: 'necromancy', file: '法师/死灵学派.html', class: 'wizard', titlePattern: /死灵学派\s*School of Necromancy/ },
  { index: 'transmutation', file: '法师/变化学派.html', class: 'wizard', titlePattern: /变化学派\s*School of Transmutation/ },
]

// 已知的职业通用介绍开头，需要过滤掉
const commonIntros = {
  barbarian: ['怒火在每个野蛮人心中燃烧'],
  cleric: ['在万神殿中，每个神都会对凡人生活和文明的特定方面产生影响', '作为一个牧师，你将选择神职能的其中一个方面来着重体现，同时你也将被授予有关该领域的部分权能。'],
  druid: ['德鲁伊组织的存在大多不为外人所知'],
  fighter: ['战士们选择不同的方式磨炼自己的作战技巧，这种差异以所选的不同武术范型作区分'],
  monk: ['多元宇宙里的众多修道院中，有三个流派流传最为深广'],
  paladin: ['成为一名圣武士必须宣誓忠于公义的事业，并踏上与秽恶为敌的道路'],
  rogue: ['游荡者们有着许多共同的特性，包括技能的精进、致命而精准的战斗手法'],
  sorcerer: [],
  warlock: ['邪术师的宗主是存在于其他位面的强大存在。他们不是神，却拥有与神相似的力量'],
  wizard: ['法师技艺的研习传统由来已久，甚至可以往前追溯到凡人刚发现魔法存在的时期'],
  bard: ['吟游诗人之道也是交际之道'],
  ranger: [],
}

function extractDesc(filePath, titlePattern) {
  const buf = fs.readFileSync(filePath)
  const html = iconv.decode(buf, 'gb2312')
  const $ = cheerio.load(html, { decodeEntities: false })

  // 遍历所有元素，找到匹配标题模式的元素
  const allElements = $('body').find('*').toArray()
  let titleIndex = -1

  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i]
    const text = $(el).text().trim()
    // 只考虑div, h2, h3, h4, p, b标签中的文本
    const tagName = el.tagName?.toLowerCase()
    if (!['div', 'h2', 'h3', 'h4', 'p', 'b'].includes(tagName)) continue

    // 标题文本通常较短，过滤掉过长的文本（避免匹配到包含标题词的通用介绍段落）
    if (text.length > 80) continue

    if (titlePattern.test(text)) {
      titleIndex = i
      break
    }
  }

  if (titleIndex === -1) {
    return []
  }

  // 从标题之后开始收集，直到下一个 h4 或下一个带边框的div
  const paragraphs = []

  for (let i = titleIndex + 1; i < allElements.length; i++) {
    const el = allElements[i]
    const tagName = el.tagName?.toLowerCase()
    const $el = $(el)

    // 停止条件：h4 特性标题
    if (tagName === 'h4') {
      break
    }

    // 如果碰到另一个带边框且包含b标签的div，可能是下一个子职业标题
    // 但排除匹配当前标题的情况（同一标题可能在多个嵌套元素中重复出现）
    if (tagName === 'div') {
      const style = $el.attr('style') || ''
      const hasBorder = style.includes('BORDER-BOTTOM')
      const hasBold = $el.find('b').length > 0
      if (hasBorder && hasBold) {
        const text = $el.text().trim()
        // 如果匹配当前标题，跳过（这是标题的重复嵌套元素）
        if (titlePattern.test(text)) continue
        if (text.length < 100 && /[A-Z][a-z]+/.test(text)) {
          break
        }
      }
    }

    if (tagName === 'p' && ($el.hasClass('MsoNormal') || $el.hasClass('msonormal'))) {
      const text = $el.text().trim().replace(/\s+/g, ' ')
      if (text.length > 15) {
        paragraphs.push(text)
      }
    }
  }

  return paragraphs
}

function removeCommonIntro(paragraphs, classKey) {
  const intros = commonIntros[classKey] || []
  return paragraphs.filter(p => {
    return !intros.some(intro => p.startsWith(intro))
  })
}

function removeActionParagraphs(paragraphs) {
  const starts = ['第', '当你选择', '选择该', '从', '你可以', '你获得', '你学会', '你习得']
  return paragraphs.filter(p => !starts.some(s => p.startsWith(s)))
}

function removeTitleParagraphs(paragraphs, titlePattern) {
  return paragraphs.filter(p => {
    if (p.length < 50 && titlePattern.test(p)) return false
    return true
  })
}

console.log('=== 子职业描述提取预览 ===\n')

for (const sc of subclassMap) {
  const filePath = path.join(CHM_BASE, sc.file)
  if (!fs.existsSync(filePath)) {
    console.log(`[${sc.index}] ${sc.file} - 文件不存在`)
    continue
  }

  let paragraphs = extractDesc(filePath, sc.titlePattern)
  paragraphs = removeCommonIntro(paragraphs, sc.class)
  paragraphs = removeActionParagraphs(paragraphs)
  paragraphs = removeTitleParagraphs(paragraphs, sc.titlePattern)

  const joined = paragraphs.join('\n')
  const preview = joined.substring(0, 120) + (joined.length > 120 ? '...' : '')

  console.log(`--- ${sc.index} ---`)
  console.log(`文件: ${sc.file}`)
  console.log(`段落数: ${paragraphs.length}`)
  console.log(`预览: ${preview}`)
  console.log()
}

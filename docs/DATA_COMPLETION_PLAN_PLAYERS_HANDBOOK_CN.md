---
title: 玩家手册中文数据补全方案（亚种 / 子职业 / 背景）
description: 基于 5e 不全书 · 玩家手册 HTML，为已存在于 5e-srd-api 中的亚种 / 子职业 / 背景补全中文描述及相关字段的实施方案。
---

# 玩家手册中文数据补全方案（亚种 / 子职业 / 背景）

> 本文档是 **数据补全执行方案**，用于指导脚本或人工从 `5e_r_chm_extracted/玩家手册` 中抽取权威中文内容，并写回 5e-srd-api 所使用的 MongoDB。
> 实际数据录入应严格以 HTML 原文为准，不做机器翻译或自由改写。

---

## 1. 目标与范围

- **目标**
  - 针对 **已在数据库中存在** 的 `subraces`、`subclasses`、`backgrounds` 条目：
    - 补全 **中文简介 / 描述（flavor）**；
    - 补全 **中文特性名称与详细描述**；
    - 对齐 **属性值调整、熟练项、语言、装备** 等关键字段的中文内容；
  - 产出一份 **可执行的数据补全方案**，包含：
    - 每个条目的 **实体标识（index / 中英文名）**；
    - **需从 HTML 抽取的字段列表** 和对应的 **HTML 路径 / 锚点**；
    - 可作为中间产物的 **标准 JSON 结构示例**。

- **范围限制**
  - 仅覆盖 **玩家手册（PHB 2014）范围内**，并且已经在数据库中存在的：
    - 亚种：所有 PHB 亚种（SRD+PHB，共 9 条）；
    - 子职业：所有 PHB 子职业（共 40 条，SRD 12 + PHB 28）；
    - 背景：PHB 背景 13 条。
  - 不处理怪物、扩展书（ Xanathar、Tasha 等）以及其它非 PHB 子职业 / 背景。

- **数据源与目标系统**
  - **HTML 数据源（权威）**：
    - `5e_r_chm_extracted/玩家手册/**/*.{html,htm}`
    - 编码为 GB2312/GBK，需在脚本中解码为 UTF-8。
  - **目标 API / 数据库**：
    - 仓库：`5e-srd-api`
    - 契约文档：`docs/API_CONTRACT.md`
    - 数据库结构与英文部分参考原 5e SRD。

---

## 2. 现有数据与目标 Schema 对齐

### 2.1 参考文档与快照

- **数据缺口总览**：`docs/DATA_GAP_PLAYERS_HANDBOOK.md`
  - 已给出 PHB 范围内的权威条目列表，以及 2026-03-08 前后的数据补全情况。
- **API 契约**：`docs/API_CONTRACT.md`
  - 约定了 `Subrace`、`Subclass`、`Background` 等资源在 API 层的字段结构。
- **API 快照**：`docs/api-snapshot/*.json`
  - 示例：
    - `subraces.json`、`subclasses.json`、`backgrounds.json`
  - 当前快照仍然反映“补全前”的 SRD 状态（仅 4 个亚种、12 个子职业、1 个背景）。  
    后续补全应基于 **最新数据库**，可按 `DATA_GAP_PLAYERS_HANDBOOK.md` 中的说明重新生成快照：
    - `BASE_URL=http://localhost:3000 node scripts/fetch-api-snapshot.mjs`

### 2.2 目标对象 Schema 摘要（来自 API_CONTRACT）

仅列出与本次中文补全密切相关的字段：

- **Subrace（亚种）**

```typescript
{
  index: string;
  name: string;
  name_en?: string;
  race: APIReference;
  desc: string;
  desc_en?: string;
  ability_bonuses: AbilityBonus[];
  ability_bonus_options?: ChoiceOption;
  starting_proficiencies?: APIReference[];
  starting_proficiency_options?: ChoiceOption;
  languages?: APIReference[];
  language_options?: ChoiceOption;
  traits: APIReference[];
}
```

- **Subclass（子职业）**

```typescript
{
  index: string;
  class: APIReference;
  name: string;
  name_en?: string;
  subclass_flavor: string;
  desc: string[];
  desc_en?: string[];
  spells?: { prerequisites: APIReference[]; spell: APIReference }[];
  subclass_levels: string; // 指向 /api/2014/classes/{class}/levels?subclass={index}
}
```

- **Background（背景）**

```typescript
{
  index: string;
  name: string;
  name_en?: string;
  starting_proficiencies: APIReference[];
  language_options?: ChoiceOption;
  starting_equipment: StartingEquipment[];
  starting_equipment_options: ChoiceOption[];
  feature: { name: string; name_en?: string; desc: string[]; desc_en?: string[] };
  personality_traits: ChoiceOption;
  ideals: ChoiceOption;
  bonds: ChoiceOption;
  flaws: ChoiceOption;
}
```

### 2.3 中间产物 Schema（*_cn 字段）

为方便从 HTML → JSON → Mongo 的流程，本方案约定一个仅用于“补全过程”的中间 JSON 结构：

- `subraces[*].name_cn`, `subraces[*].desc_cn[]`, `subraces[*].ability_bonuses`（带属性 index 与数值）、`subraces[*].traits[]`；
- `subclasses[*].name_cn`, `subclasses[*].subclass_flavor_cn[]`, `subclasses[*].features_cn[]`；
- `backgrounds[*].name_cn`, `backgrounds[*].desc_cn[]`, `backgrounds[*].feature_cn`, `backgrounds[*].starting_proficiencies_cn[]`，以及 personality / ideals / bonds / flaws 的中文数组等。

在真正写入数据库时：

- `*_cn` 会被映射回 API 契约中的 `desc` / `subclass_flavor` / `feature.desc` / `personality_traits.desc` 等字段；
- 其中的 **中文文本必须一字不差来源于 HTML**，允许在 JSON 中加入省略号 `……` 表示截断，但不允许自由增删改写语义。

---

## 3. 现状总览表（3.1）

结合 `DATA_GAP_PLAYERS_HANDBOOK.md` 与 PHB 本身的权威列表，可得到如下总览（以 **PHB 应有条目数** 为准）：

| 类别     | 条目数量（PHB 范围）                    | 已完整字段（整体情况）                                          | 缺失 / 待完善字段（整体情况）                                                                 |
|----------|-----------------------------------------|------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| 亚种     | **9**（SRD 4 + 新增 5）                | `index` / `name` / `name_en` 基本齐全；归属种族引用正确         | 多数缺少 **中文简介 `desc`**、**亚种专属属性加值**（如 INT/WIS/CHA+1）、**特性中文描述**     |
| 子职业   | **40**（快照中 SRD 12 + 新增 28）      | 大部分已有正确的 `index` / `name` / `class` 关联                | `subclass_flavor` 大多为空；`desc[]` 仅英文或缺失；子职业特性（通过 `features` / `levels`）缺少中文描述 |
| 背景     | **13**                                  | 仅 `acolyte`（侍僧）相对完整；其余 12 条已按 index 新增         | 背景简介 `desc` 缺少中文；`feature.desc` 为空；四类 personality/ideals/bonds/flaws 的选项仅有英文或为空；起始装备文本多为英文或缺失 |

> 说明：
> - `docs/api-snapshot/*.json` 当前仍是“补全前”快照，仅能代表 SRD 子集；实际补全应以 **最新数据库快照** 为准。
> - 上表中的“条目数量”按 PHB 规则书本身计算：9 个亚种、40 个子职业、13 个背景。

---

## 4. 详细补全清单（3.2）

本节按资源类型给出 **逐条目补全过程信息**。  
考虑到条目数较多，本方案采用：

- 为每个条目提供：**index / 中英文名 / HTML 路径 / 需补字段集合**；
- 再为每一类资源提供 **1–2 个完整 JSON 示例**，展示字段如何从 HTML 映射到中间结构。

### 4.1 Subraces（亚种）

#### 4.1.1 条目列表与 HTML 映射

> 所有亚种均出现在种族章节内的单独小节中，形式类似：
> `<h4>高等精灵 High Elf</h4>`，后跟若干段落和粗体特性小节。

| API index          | 英文名                | 中文名       | 玩家手册路径                        | 说明 / 需补字段                                                                                   |
|--------------------|-----------------------|--------------|-------------------------------------|----------------------------------------------------------------------------------------------------|
| `high-elf`         | High Elf              | 高等精灵     | `种族/精灵.html`                    | 需补：`desc_cn[]`、亚种专属 `ability_bonuses`（智力+1）、精灵武器训练 / 戏法 / 额外语言 等特性中文描述 |
| `wood-elf`         | Wood Elf              | 木精灵       | `种族/精灵.html`                    | 需补：`desc_cn[]`、感知+1、精灵武器训练 / 轻捷步伐 / 野性面具 等特性中文描述                      |
| `drow`             | Dark Elf (Drow)       | 黑暗精灵 / 卓尔 | `种族/精灵.html`                  | 需补：`desc_cn[]`、魅力+1、增强黑暗视觉 / 日照敏感 / 卓尔魔法 / 卓尔武器训练 等特性中文描述       |
| `hill-dwarf`       | Hill Dwarf            | 丘陵矮人     | `种族/矮人.html`                    | 需补检查：体质+2 已有；感知+1、额外生命值等是否完整；矮人韧性、矮人战技等特性中文描述是否齐全     |
| `mountain-dwarf`   | Mountain Dwarf        | 山地矮人     | `种族/矮人.html`                    | 需补：力量+2；中甲 / 轻甲熟练项中文说明；检查矮人特性中文是否齐全                                 |
| `lightfoot-halfling` | Lightfoot Halfling | 轻足半身人   | `种族/半身人.html`                  | 需补检查：敏捷+2、魅力+1 是否齐；幸运、勇敢、小小之躯、天性隐匿等特性中文描述                    |
| `stout-halfling`   | Stout Halfling        | 壮硕半身人   | `种族/半身人.html`                  | 需补：体质+1；针对毒素的豁免优势、毒素抗性等中文描述；复用半身人通用特性文本                     |
| `rock-gnome`       | Rock Gnome            | 岩侏儒       | `种族/侏儒.html`                    | 需补检查：智力+2、额外体质+1；工匠知识、小工具、发条装置等特性中文描述                           |
| `forest-gnome`     | Forest Gnome          | 森林侏儒     | `种族/侏儒.html`                    | 需补：敏捷+1；自然幻象 / 与小兽交流等特性中文描述                                                 |

#### 4.1.2 需从 HTML 抽取的字段（通用）

对上述每个亚种，需统一从对应 HTML 小节中抽取：

- **中文简介**：亚种标题之后、首个粗体特性标题之前的 1–2 段正文 → `desc_cn[]`；
- **属性值加成**：含有“属性值加成 / 属性值提升”的粗体段落 → `ability_bonuses`：
  - 解析中文句子中的属性名与数值，例如“你的智力加 1”→ `{ ability_score_index: "int", bonus: 1 }`；
- **专属特性**：亚种小节内的粗体特性标题与其后段落：
  - 高等精灵：精灵武器训练 / 戏法 / 额外语言；
  - 木精灵：精灵武器训练 / 轻捷步伐 / 野性面具；
  - 卓尔：增强黑暗视觉 / 日照敏感 / 卓尔魔法 / 卓尔武器训练；
  - 其它亚种：对应 SRD 中的专属特性。
- **语言 / 熟练项选项**：如“你能说、读、写一门额外自选语言”等规则文本，可作为 `language_options` 或 `starting_proficiency_options` 的中文描述。

---

### 4.2 Subclasses（子职业）

#### 4.2.1 条目列表与 HTML 映射（按职业分组）

> 所有子职业都有单独 HTML 文件：`玩家手册/职业/{职业名}/{子职业中文名}.html`。

**野蛮人（Barbarian）**

| API index        | 中文名       | HTML 路径                       | 说明 / 需补字段                                         |
|------------------|--------------|----------------------------------|--------------------------------------------------------|
| `berserker`      | 狂战士道途   | `职业/野蛮人/狂战士道途.html`   | 需补 `subclass_flavor_cn`、各级特性中文描述            |
| `totem-warrior`* | 图腾武者道途 | `职业/野蛮人/图腾武者道途.html` | 仅 PHB；需补 flavor、图腾选择规则与各图腾特性中文描述 |

**吟游诗人（Bard）**

| API index   | 中文名   | HTML 路径                        |
|-------------|----------|-----------------------------------|
| `lore`      | 逸闻学院 | `职业/吟游诗人/逸闻学院.html`    |
| `valor`*    | 勇气学院 | `职业/吟游诗人/勇气学院.html`    |

**牧师（Cleric）**

| API index     | 中文名   | HTML 路径                      |
|---------------|----------|---------------------------------|
| `life`        | 生命领域 | `职业/牧师/生命领域.html`      |
| `knowledge`*  | 知识领域 | `职业/牧师/知识领域.html`      |
| `light`*      | 光明领域 | `职业/牧师/光明领域.html`      |
| `tempest`*    | 风暴领域 | `职业/牧师/风暴领域.html`      |
| `war`*        | 战争领域 | `职业/牧师/战争领域.html`      |
| `trickery`*   | 诡术领域 | `职业/牧师/诡术领域.html`      |
| `nature`*     | 自然领域 | `职业/牧师/自然领域.html`      |

**德鲁伊（Druid）**

| API index    | 中文名   | HTML 路径                      |
|--------------|----------|---------------------------------|
| `land`       | 大地结社 | `职业/德鲁伊/大地结社.html`    |
| `circle-of-the-moon`* | 月亮结社 | `职业/德鲁伊/月亮结社.html`  |

**战士（Fighter）**

| API index        | 中文名     | HTML 路径                      |
|------------------|------------|---------------------------------|
| `champion`       | 勇士       | `职业/战士/勇士.html`          |
| `battle-master`* | 战斗大师   | `职业/战士/战斗大师.html`      |
| `eldritch-knight`* | 奥法骑士 | `职业/战士/奥法骑士.html`      |

**武僧（Monk）**

| API index         | 中文名   | HTML 路径                     |
|-------------------|----------|--------------------------------|
| `open-hand`       | 散打宗   | `职业/武僧/散打宗.html`       |
| `shadow`*         | 暗影宗   | `职业/武僧/暗影宗.html`       |
| `four-elements`*  | 四象宗   | `职业/武僧/四象宗.html`       |

**圣武士（Paladin）**

| API index     | 中文名     | HTML 路径                       |
|---------------|------------|----------------------------------|
| `devotion`    | 奉献之誓   | `职业/圣武士/奉献之誓.html`     |
| `vengeance`*  | 复仇之誓   | `职业/圣武士/复仇之誓.html`     |
| `ancients`*   | 古贤之誓   | `职业/圣武士/古贤之誓.html`     |

**游侠（Ranger）**

| API index   | 中文名   | HTML 路径                     |
|-------------|----------|--------------------------------|
| `hunter`    | 猎人     | `职业/游侠/猎人.html`         |
| `beast-master`* | 驯兽师 | `职业/游侠/驯兽师.html`      |

**游荡者（Rogue）**

| API index       | 中文名   | HTML 路径                      |
|-----------------|----------|---------------------------------|
| `thief`         | 盗贼     | `职业/游荡者/盗贼.html`        |
| `assassin`*     | 刺客     | `职业/游荡者/刺客.html`        |
| `arcane-trickster`* | 诡术师 | `职业/游荡者/诡术师.html`    |

**术士（Sorcerer）**

| API index     | 中文名   | HTML 路径                      |
|---------------|----------|---------------------------------|
| `draconic`    | 龙族血脉 | `职业/术士/龙族血脉.html`      |
| `wild-magic`* | 狂野魔法 | `职业/术士/狂野魔法.html`      |

**邪术师（Warlock）**

| API index        | 中文名     | HTML 路径                         |
|------------------|------------|------------------------------------|
| `fiend`          | 邪魔       | `职业/邪术师/邪魔.html`           |
| `archfey`*       | 至高妖精   | `职业/邪术师/至高妖精.html`       |
| `great-old-one`* | 旧日支配者 | `职业/邪术师/旧日支配者.html`     |
| `undying-light`* / `blade-pact`* | 魔能祈唤 | `职业/邪术师/魔能祈唤.html`（视数据库实际 index 而定） |

**法师（Wizard）**

| API index        | 中文名     | HTML 路径                        |
|------------------|------------|-----------------------------------|
| `evocation`      | 塑能学派   | `职业/法师/塑能学派.html`        |
| `abjuration`*    | 防护学派   | `职业/法师/防护学派.html`        |
| `conjuration`*   | 咒法学派   | `职业/法师/咒法学派.html`        |
| `divination`*    | 预言学派   | `职业/法师/预言学派.html`        |
| `enchantment`*   | 惑控学派   | `职业/法师/惑控学派.html`        |
| `illusion`*      | 幻术学派   | `职业/法师/幻术学派.html`        |
| `necromancy`*    | 死灵学派   | `职业/法师/死灵学派.html`        |
| `transmutation`* | 变化学派   | `职业/法师/变化学派.html`        |

> 带 `*` 的 index 为按 5e SRD/PHB 约定的 **推断 index**，最终以实际数据库 / 5e-srd 源数据为准。

#### 4.2.2 需从 HTML 抽取的字段（通用）

每个子职业需补全的核心字段：

- **子职业简要描述** → `subclass_flavor_cn[]`
  - 来自子职业大标题（如“月亮结社 Circle of the Moon”）之后的 1–2 段介绍性文字；
- **子职业特性** → `features_cn[]`
  - HTML 中的 `<h4>` 特性标题（如“战斗荒野形态 Combat Wild Shape”）和其后所有说明段落；
  - 对应 API 中 `features` 集合中该特性的 `name` / `desc[]`；
- **子职业专属法术**（若存在）→ 填入 `spells[*].spell` 引用的中文名 / index 映射；
- **与等级关联的特性** → 通过 `subclass_levels` 关联到 `/classes/{class}/levels?subclass={index}`：
  - 本方案只要求 **补充中文描述**，不变更结构。

---

### 4.3 Backgrounds（背景）

#### 4.3.1 条目列表与 HTML 映射

> 背景文件统一位于：`玩家手册/个性与背景/{背景中文名}.html`。

| API index         | 英文名         | 中文名   | HTML 路径                    |
|-------------------|----------------|----------|-------------------------------|
| `acolyte`         | Acolyte        | 侍僧     | `个性与背景/侍僧.html`       |
| `guild-artisan`   | Guild Artisan  | 公会工匠 | `个性与背景/公会工匠.html`   |
| `outlander`       | Outlander      | 化外之民 | `个性与背景/化外之民.html`   |
| `soldier`         | Soldier        | 士兵     | `个性与背景/士兵.html`       |
| `folk-hero`       | Folk Hero      | 平民英雄 | `个性与背景/平民英雄.html`   |
| `sage`            | Sage           | 智者     | `个性与背景/智者.html`       |
| `sailor`          | Sailor         | 水手     | `个性与背景/水手.html`       |
| `urchin`          | Urchin         | 流浪儿   | `个性与背景/流浪儿.html`     |
| `criminal`        | Criminal       | 罪犯     | `个性与背景/罪犯.html`       |
| `entertainer`     | Entertainer    | 艺人     | `个性与背景/艺人.html`       |
| `noble`           | Noble          | 贵族     | `个性与背景/贵族.html`       |
| `hermit`          | Hermit         | 隐士     | `个性与背景/隐士.html`       |
| `charlatan`       | Charlatan      | 骗子     | `个性与背景/骗子.html`       |

#### 4.3.2 需从 HTML 抽取的字段（通用）

每个背景至少需要补全以下内容：

- **背景简介** → `desc_cn[]`
  - 文件顶部背景标题之后的 1–2 段文字，描述该背景的生活环境与角色定位；
- **技能 / 工具 / 语言熟练项** → `starting_proficiencies` / `language_options`
  - `技能熟练项：` 行中的中文技能名（如“洞悉，宗教”）；
  - `工具熟练项：`、`语言：任选 X 门语言` 等；
- **起始装备** → `starting_equipment` / `starting_equipment_options`
  - `装备：` 行列出的具体物品及数量；
  - 对存在可选装备的背景，将 A/B 选项拆分成 `ChoiceOption`；
- **背景特性** → `feature.name` / `feature.desc[]`
  - 形如 `特性：信仰庇护 Feature: Shelter of the Faithful` 标题下的所有说明段落；
- **个性 / 理想 / 牵绊 / 缺点** → `personality_traits` / `ideals` / `bonds` / `flaws`
  - HTML 中的 `table.MsoNormalTable`，按表头 `特点 / 理想 / 牵绊 / 缺点` 区分；
  - 每一行右列的中文句子作为 `ChoiceOption` 中的一个 `desc` 条目，括号中的阵营标签（如“（守序）”）可保留在字符串内。

---

## 5. HTML 解析与字段映射策略（3.2 / 3.3 结合）

### 5.1 通用解析规则

1. **编码处理**
   - 所有玩家手册 HTML 的 `<meta charset>` 为 GB2312/GBK；
   - 解析时需按 GBK 解码，再转成 UTF-8 字符串供 `cheerio` / `jsdom` 使用。

2. **标题模式**
   - 资源标题通常以「**中文名 + English Name**」出现，例如：
     - `精灵 Elf`、`高等精灵 High Elf`、`月亮结社 Circle of the Moon`、`侍僧 Acolyte`；
   - 子章节特性多为 `<h4>` 或带粗体的段落："战斗荒野形态 Combat Wild Shape"、"特性：信仰庇护 Feature: Shelter of the Faithful" 等。

3. **结构特征**
   - **亚种 / 子职业**：标题下是一段或多段说明文字，再跟若干粗体特性小节；
   - **背景**：
     - 顶部为背景简介；
     - 之后是“技能熟练项 / 语言 / 装备”行；
     - 再之后是“特性：XXX”大段描述；
     - 最后是 3~4 个表格（特点 / 理想 / 牵绊 / 缺点）。

4. **推荐解析工具与帮助函数**

以 Node.js 为例（仅示意）：

```ts
import cheerio from 'cheerio';

// 从指定中英标题开始，收集直到下一个同级标题的所有 <p> 文本
function extractHeadingPlusParagraphs($, headingTextCn: string, headingTextEn?: string): string[] {
  // 伪代码：根据 headingTextCn / headingTextEn 精确匹配 <h2>/<h4>，然后顺序收集兄弟节点中的 <p>
}

// 提取带中文标签的属性块，如「属性值加成」「技能熟练项」
function extractLabeledBlock($, labelCn: string): string {
  // 伪代码：在 <p> 中查找以 labelCn 开头的粗体文本，然后返回整段中文
}

// 提取背景的特点 / 理想 / 牵绊 / 缺点表格
function extractTableOptions($, titleCn: string): string[] {
  // 伪代码：定位表头中出现 titleCn 的表格，返回每一行右侧单元格的纯中文文本数组
}
```

### 5.2 样例：亚种 high-elf（高等精灵）

- **HTML 位置**
  - `5e_r_chm_extracted/玩家手册/种族/精灵.html`
  - 从 `<h4>高等精灵 High Elf</h4>` 起，直到下一个同级标题（木精灵）为止。

- **需抽取内容**
  - **简介段落**（示例节选）：
    - “作为一名高等精灵，你拥有机敏的思维，且精通或多或少的魔法知识。在大部分 D&D 世界中，高等精灵都被分为两类……”
    - “费伦的日精灵（又被称为金精灵……），而月精灵（也叫做银精灵……）……”
  - **属性值加成**：
    - “属性值加成……你的智力加 1。”
  - **特性**：
    - “精灵武器训练……你拥有长剑、短剑、短弓和长弓的熟练项。”
    - “戏法……你习得一个戏法，从法师法术列表中选择之。其施法属性为智力。”
    - “额外语言……你能说、读、写一门额外的自选语言。”

- **中间 JSON 示例**

```json
{
  "index": "high-elf",
  "name": "High Elf",
  "name_cn": "高等精灵",
  "source_html": "5e_r_chm_extracted/玩家手册/种族/精灵.html#高等精灵",
  "desc_cn": [
    "作为一名高等精灵，你拥有机敏的思维，且精通或多或少的魔法知识。在大部分 D&D 世界中，高等精灵都被分为两类……",
    "费伦的日精灵（又被称为金精灵）……而月精灵（也叫做银精灵或灰精灵）……"
  ],
  "ability_bonuses": [
    { "ability_score_index": "dex", "bonus": 2 },
    { "ability_score_index": "int", "bonus": 1 }
  ],
  "traits": [
    {
      "name_cn": "精灵武器训练",
      "desc_cn": "你拥有长剑、短剑、短弓和长弓的熟练项。"
    },
    {
      "name_cn": "戏法",
      "desc_cn": "你习得一个戏法，从法师法术列表中选择之。其施法属性为智力。"
    },
    {
      "name_cn": "额外语言",
      "desc_cn": "你能说、读、写一门额外的自选语言。"
    }
  ]
}
```

### 5.3 样例：子职业 circle-of-the-moon（月亮结社）

- **HTML 位置**
  - `5e_r_chm_extracted/玩家手册/职业/德鲁伊/月亮结社.html`
  - 从大标题“月亮结社 Circle of the Moon”开始。

- **需抽取内容**
  - **子职业 flavor**：
    - “月亮结社的德鲁伊都是凶猛的荒野卫士……其德鲁伊之血充满野性。”
  - **特性小节**：
    - `战斗荒野形态 Combat Wild Shape`：
      - “从你选择该结社的第 2 级起，你可以在自己回合内用一个附赠动作而不是动作来使用荒野形态特性……”
    - `结社形态 Circle Forms`：
      - “结社的力量让你可以变成更危险的动物形态……”
    - `原初打击 Primal Strike`、`元素荒野形态 Elemental Wild Shape`、`千面相 Thousand Forms` 等。

- **中间 JSON 示例**

```json
{
  "index": "circle-of-the-moon",
  "class_index": "druid",
  "name": "Circle of the Moon",
  "name_cn": "月亮结社",
  "source_html": "5e_r_chm_extracted/玩家手册/职业/德鲁伊/月亮结社.html",
  "subclass_flavor_cn": [
    "月亮结社的德鲁伊都是凶猛的荒野卫士。他们聚集在满月之下分享情报，交换警示……",
    "该结社的德鲁伊如月亮般善变，他们会作为野猫徘徊一晚，第二天又成为一只盘旋在树顶老鹰……"
  ],
  "features": [
    {
      "name_cn": "战斗荒野形态",
      "name_en": "Combat Wild Shape",
      "desc_cn": [
        "从你选择该结社的第 2 级起，你可以在自己回合内用一个附赠动作而不是动作来使用荒野形态特性。",
        "此外，在你荒野形态变形期间，你可以用附赠动作消耗一个法术位来恢复相应法术位每环阶 1d8 点生命值。"
      ]
    },
    {
      "name_cn": "结社形态",
      "name_en": "Circle Forms",
      "desc_cn": [
        "结社的力量让你可以变成更危险的动物形态。第 2 级起，你用荒野形态特性变身的野兽其挑战等级至高为 1……"
      ]
    }
  ]
}
```

### 5.4 样例：背景 acolyte（侍僧）

- **HTML 位置**
  - `5e_r_chm_extracted/玩家手册/个性与背景/侍僧.html`

- **需抽取内容**
  - 顶部 2 段背景描述；
  - `技能熟练项：洞悉，宗教`；
  - `语言：任选两门语言`；
  - `装备：一枚圣徽……一个装着 15 gp 的小包。`；
  - 特性 `信仰庇护 Shelter of the Faithful` 的完整描述；
  - “特点 / 理想 / 牵绊 / 缺点”表格中的所有中文句子。

- **中间 JSON 示例**

```json
{
  "index": "acolyte",
  "name": "Acolyte",
  "name_cn": "侍僧",
  "source_html": "5e_r_chm_extracted/玩家手册/个性与背景/侍僧.html",
  "desc_cn": [
    "你投身于服务某个神或某个神系的神庙。作为神域与俗世的中间人，你负责主持神圣仪式与安排对神的奉献，并引导信众感受神能的显灵……",
    "你可以从附录 B 的表格中选择某名神、某个神系或其他类神存在……"
  ],
  "starting_proficiencies_cn": ["洞悉", "宗教"],
  "languages_rule_cn": "任选两门语言。",
  "starting_equipment_cn": "一枚圣徽（出任神职时的礼物），一本祷告经书或经轮，5 根熏香，祭袍，一套普通服装，以及一个装着 15 gp 的小包。",
  "feature": {
    "name_cn": "信仰庇护",
    "name_en": "Shelter of the Faithful",
    "desc_cn": [
      "作为一名侍僧，你与同一信仰的同志互相尊重，并且可以随时主持相应神的神圣仪式……",
      "靠近这座神庙时，你可以召来祭司提供帮助，而只要你所要求的协助风险不高，你就能一直与该神庙保持良好的关系。"
    ]
  },
  "personality_traits_cn": [
    "我崇拜某个英雄，并时刻以其事迹作为榜样。",
    "我能在最狂乱的敌人间寻找共鸣，然后感化他们一同为和平而努力。",
    "……（其余 6 条略）"
  ],
  "ideals_cn": [
    "传统。古代崇拜与献祭的传统必须被保护并维持。（守序）",
    "仁爱。我总是试图帮助那些需要帮助的人，无论个人的花费如何。（善良）",
    "……"
  ],
  "bonds_cn": [
    "为了找回很久前丢失的与我信仰相关的一件古代遗物，我可以付出生命。",
    "终有一天我会对谴责我为异端的罪恶神庙组织复仇。",
    "……"
  ],
  "flaws_cn": [
    "我评价他人十分严苛，并且对自己更加苛刻。",
    "我的虔诚有时令我盲目信任那些声称与我信仰相同的人。",
    "……"
  ]
}
```

---

## 6. 标准化数据 Schema 示例（3.3）

以下为本方案建议的 **汇总 JSON 结构**，可作为脚本输出格式，用于后续批量写入数据库。  
（实际执行时建议将每类资源拆成独立 JSON 文件，便于 diff 与回滚。）

```json
{
  "subraces": [
    {
      "index": "high-elf",
      "name": "High Elf",
      "name_cn": "高等精灵",
      "desc_cn": ["……"],
      "ability_bonuses": [
        { "ability_score_index": "dex", "bonus": 2 },
        { "ability_score_index": "int", "bonus": 1 }
      ],
      "traits": [
        { "name_cn": "精灵武器训练", "desc_cn": "……" },
        { "name_cn": "戏法", "desc_cn": "……" },
        { "name_cn": "额外语言", "desc_cn": "……" }
      ]
    }
    // 其余 8 个亚种同样结构
  ],
  "subclasses": [
    {
      "index": "circle-of-the-moon",
      "class_index": "druid",
      "name": "Circle of the Moon",
      "name_cn": "月亮结社",
      "subclass_flavor_cn": ["……"],
      "features": [
        { "name_cn": "战斗荒野形态", "desc_cn": ["……"] },
        { "name_cn": "结社形态", "desc_cn": ["……"] }
      ]
    }
    // 其余子职业同样结构
  ],
  "backgrounds": [
    {
      "index": "acolyte",
      "name": "Acolyte",
      "name_cn": "侍僧",
      "desc_cn": ["……"],
      "starting_proficiencies_cn": ["洞悉", "宗教"],
      "languages_rule_cn": "任选两门语言。",
      "starting_equipment_cn": "一枚圣徽……",
      "feature": {
        "name_cn": "信仰庇护",
        "desc_cn": ["……"]
      },
      "personality_traits_cn": ["……"],
      "ideals_cn": ["……"],
      "bonds_cn": ["……"],
      "flaws_cn": ["……"]
    }
    // 其余 12 个背景同样结构
  ]
}
```

> 字段说明：
> - `*_cn` 字段仅用于锁定 HTML 中的中文内容，避免后续误操作；写入数据库时会被映射到 API 契约中的 `desc` / `feature.desc` 等字段；
> - 若后续需要英文对照，可在同一结构中加入 `*_en` 字段，但本次补全任务不强制要求补英文。

---

## 7. 推荐执行流程（脚本 / 人工共用）

1. **刷新 API 快照（可选但推荐）**
   - 在本地启动 5e-srd-api 后，执行：
     - `BASE_URL=http://localhost:3000 node scripts/fetch-api-snapshot.mjs`
   - 确认 `docs/api-snapshot/subraces.json` / `subclasses.json` / `backgrounds.json` 中条目数分别为 9 / 40 / 13。

2. **按本方案生成中间 JSON**
   - 为每类资源单独编写脚本：
     - 从 `5e_r_chm_extracted/玩家手册` 读取 HTML（GBK 解码）；
     - 使用本文件第 5 章所述的解析规则抽取 `*_cn` 字段；
     - 输出到 `docs/data-completion/subraces.phb.cn.json` 等文件。

3. **人工抽查与修订**
   - 随机抽取若干条（至少每类 3 条，包括本方案中的 high-elf / circle-of-the-moon / acolyte）：
     - 对照 HTML 原文和中间 JSON；
     - 确认无丢句、无误拆、无编码问题。

4. **写回数据库 / 生成 Mongo 更新脚本**
   - 方式一：在 `scripts/seed-data-gap.mjs` 基础上增加“中文字段补全”逻辑；
   - 方式二：生成 Mongo `updateMany` 脚本，按 `index` 匹配，写入对应 `desc` / `feature.desc` 等字段。

5. **回归测试**
   - 重新运行 `scripts/fetch-api-snapshot.mjs`，检查：
     - 详情接口中 `desc` / `feature.desc` 是否已包含中文文本；
     - 结构与 `docs/API_CONTRACT.md` 保持一致。


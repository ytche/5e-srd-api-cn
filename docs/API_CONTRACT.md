# D&D 5e 车卡系统 - API 契约文档

> 前后端共同遵循的数据格式与接口约定。本文档为 **5e-srd-api** 与 **character-builder** 的对接规范。

**维护位置**：`5e-srd-api/docs/API_CONTRACT.md`（后端仓库，单一来源）

---

## 1. 概述

### 1.1 Base URL

| 环境     | Base URL                    |
|----------|-----------------------------|
| 本地开发 | `http://localhost:3000`      |
| 生产环境 | 按实际部署配置              |

### 1.2 版本前缀

- **SRD 2014**：`/api/2014`
- 完整路径示例：`http://localhost:3000/api/2014/classes`

### 1.3 约定

- **字段命名**：统一使用 **snake_case**（如 `ability_bonuses`、`name_en`）
- **响应格式**：裸 JSON，**无** `{ code, message, data }` 包装
- **语言**：数据库同时存储中英字段，`name` 为中文，`name_en` 为英文；详情接口返回数据库中的全部字段

---

## 2. 通用响应格式

### 2.1 列表响应

所有 `GET /api/2014/{resource}` 返回：

```json
{
  "count": 12,
  "results": [
    {
      "index": "barbarian",
      "name": "野蛮人",
      "url": "/api/2014/classes/barbarian"
    }
  ]
}
```

| 字段     | 类型   | 说明           |
|----------|--------|----------------|
| `count`  | number | 结果数量       |
| `results`| array  | 资源摘要数组   |

**列表项字段**：`index`、`name`、`url`（部分资源若数据库有 `name_en`，后端可在列表 select 中加入，前端按需使用）

### 2.2 详情响应

`GET /api/2014/{resource}/{index}` 返回该资源的**完整文档**，字段由数据库决定。数据库中存在的中英字段（如 `name`、`name_en`、`desc`、`desc_en`）均会返回。

### 2.3 错误响应

| HTTP 状态码 | 说明           | Body 示例                                      |
|-------------|----------------|------------------------------------------------|
| 400         | 参数校验失败   | `{ "error": "Invalid query parameters", "details": [...] }` |
| 404         | 资源不存在     | `{ "error": "Not found" }` 或 Express 默认 404 |
| 500         | 服务器错误     | `{ "message": "错误信息" }`                    |

---

## 3. 通用数据结构

### 3.1 APIReference

资源引用，用于嵌套结构：

```typescript
{
  index: string;   // 资源唯一标识
  name: string;    // 中文名称
  name_en?: string; // 英文名称（数据库有则返回）
  url?: string;    // 详情 URL
}
```

### 3.2 AbilityBonus

属性加值：

```typescript
{
  ability_score: APIReference;  // 属性引用
  bonus: number;                 // 加值
}
```

### 3.3 ChoiceOption / OptionSet

选择结构（如熟练项选择、语言选择等）：

```typescript
// ChoiceOption
{
  desc: string;
  desc_en?: string;
  choose: number;
  type: string;
  from: OptionSet;
}

// OptionSet 三种类型
| option_set_type     | 额外字段                    |
|---------------------|-----------------------------|
| options_array       | options: Option[]           |
| equipment_category  | equipment_category: APIReference |
| resource_list       | resource_list_url: string   |
```

### 3.4 StartingEquipment

起始装备：

```typescript
{
  equipment: APIReference;
  quantity: number;
}
```

---

## 4. 端点清单

### 4.1 索引

```
GET /api/2014
```

返回所有资源入口，格式：`{ "classes": "/api/2014/classes", "races": "/api/2014/races", ... }`

### 4.2 资源列表与详情

以下资源均支持：
- **列表**：`GET /api/2014/{resource}` → `{ count, results }`
- **详情**：`GET /api/2014/{resource}/{index}` → 完整资源对象

**列表查询参数**（通用）：
| 参数   | 类型   | 说明           |
|--------|--------|----------------|
| `name` | string | 名称模糊匹配   |

| 资源         | 路径                         | 说明     |
|--------------|------------------------------|----------|
| 属性值       | `/api/2014/ability-scores`   | 六大属性 |
| 阵营         | `/api/2014/alignments`       |          |
| 背景         | `/api/2014/backgrounds`       |          |
| 职业         | `/api/2014/classes`          |          |
| 状态         | `/api/2014/conditions`       |          |
| 伤害类型     | `/api/2014/damage-types`     |          |
| 装备分类     | `/api/2014/equipment-categories` |      |
| 装备         | `/api/2014/equipment`        |          |
| 专长         | `/api/2014/feats`            |          |
| 特性         | `/api/2014/features`         |          |
| 语言         | `/api/2014/languages`       |          |
| 魔法物品     | `/api/2014/magic-items`     |          |
| 法术学派     | `/api/2014/magic-schools`   |          |
| 怪物         | `/api/2014/monsters`        | 支持额外查询参数 |
| 熟练项       | `/api/2014/proficiencies`   |          |
| 种族         | `/api/2014/races`           |          |
| 规则         | `/api/2014/rules`           |          |
| 规则章节     | `/api/2014/rule-sections`   |          |
| 技能         | `/api/2014/skills`          |          |
| 法术         | `/api/2014/spells`          | 支持额外查询参数 |
| 子职业       | `/api/2014/subclasses`      |          |
| 亚种         | `/api/2014/subraces`        |          |
| 特质         | `/api/2014/traits`          |          |
| 武器属性     | `/api/2014/weapon-properties` |        |

### 4.3 职业子资源 (classes)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/2014/classes/{index}/subclasses` | 该职业的子职业列表 |
| GET | `/api/2014/classes/{index}/starting-equipment` | 起始装备 |
| GET | `/api/2014/classes/{index}/spellcasting` | 施法信息 |
| GET | `/api/2014/classes/{index}/spells` | 可选 `?level=1,2` |
| GET | `/api/2014/classes/{index}/features` | 职业特性 |
| GET | `/api/2014/classes/{index}/proficiencies` | 熟练项 |
| GET | `/api/2014/classes/{index}/multi-classing` | 多职业规则 |
| GET | `/api/2014/classes/{index}/levels` | 可选 `?subclass=xxx` |
| GET | `/api/2014/classes/{index}/levels/{level}` | 单级详情 |
| GET | `/api/2014/classes/{index}/levels/{level}/spells` | 该级法术 |
| GET | `/api/2014/classes/{index}/levels/{level}/features` | 该级特性 |

### 4.4 种族子资源 (races)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/2014/races/{index}/subraces` | 该种族的亚种列表 |
| GET | `/api/2014/races/{index}/proficiencies` | 熟练项 |
| GET | `/api/2014/races/{index}/traits` | 种族特质 |

---

## 5. 车卡相关资源数据结构

> 以下为前后端共同遵守的**详情响应**字段约定。数据库中存在的中英字段均会返回；`*_en` 为可选，有则前端可展示英文。

### 5.1 Race（种族）

```typescript
{
  index: string;
  name: string;
  name_en?: string;
  speed: number;
  ability_bonuses: AbilityBonus[];
  ability_bonus_options?: ChoiceOption;
  alignment: string;
  alignment_en?: string;
  age: string;
  age_en?: string;
  size: string;
  size_en?: string;
  size_description: string;
  size_description_en?: string;
  languages: APIReference[];
  language_desc: string;
  language_desc_en?: string;
  language_options?: ChoiceOption;
  traits: APIReference[];
  subraces: APIReference[];
  starting_proficiencies?: APIReference[];
  starting_proficiency_options?: ChoiceOption;
  url?: string;
}
```

### 5.2 Subrace（亚种）

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
  url?: string;
}
```

### 5.3 Class（职业）

```typescript
{
  index: string;
  name: string;
  name_en?: string;
  hit_die: number;
  proficiency_choices: ChoiceOption[];
  proficiencies: APIReference[];
  saving_throws: APIReference[];
  starting_equipment: StartingEquipment[];
  starting_equipment_options: ChoiceOption[];
  class_levels: string;
  multi_classing?: Multiclassing;
  spellcasting?: Spellcasting;
  subclasses: APIReference[];
  url?: string;
}

// Multiclassing
{
  prerequisites?: { ability_score: APIReference; minimum_score: number }[];
  prerequisite_options?: ChoiceOption;
  proficiencies: APIReference[];
  proficiency_choices?: ChoiceOption[];
}

// Spellcasting
{
  level: number;
  spellcasting_ability: APIReference;
  info: { name: string; desc: string[] }[];
}
```

### 5.4 Subclass（子职业）

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
  subclass_levels: string;
  url?: string;
}
```

### 5.5 Background（背景）

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
  url?: string;
}
```

### 5.6 Spell（法术）

```typescript
{
  index: string;
  name: string;
  name_en?: string;
  desc: string[];
  higher_level?: string[];
  range: string;
  components: ('V' | 'S' | 'M')[];
  material?: string;
  ritual: boolean;
  duration: string;
  concentration: boolean;
  casting_time: string;
  level: number;
  attack_type?: string;
  damage?: { damage_type: APIReference; damage_at_slot_level?: Record<string, string>; damage_at_character_level?: Record<string, string> };
  school: APIReference;
  classes: APIReference[];
  subclasses: APIReference[];
  url?: string;
}
```

### 5.7 Feat（专长）

```typescript
{
  index: string;
  name: string;
  name_en?: string;
  prerequisites?: { ability_score: APIReference; minimum_score: number }[];
  desc: string[];
  desc_en?: string[];
  url?: string;
}
```

### 5.8 AbilityScore（属性值）

```typescript
{
  index: string;
  name: string;
  name_en?: string;
  full_name: string;
  desc: string[];
  skills: APIReference[];
  url: string;
}
```

---

## 6. 前后端开发约定

### 6.1 后端 (5e-srd-api)

- 确保数据库中各资源包含 `name`（中文）与 `name_en`（英文）等双语字段
- 详情接口返回 Mongo 文档完整内容，不做字段裁剪（除 `_id` 等内部字段按需排除）
- 列表接口当前 `select({ index, name, url })`；若需列表也含 `name_en`，在 `SimpleController.index` 的 select 中加入

### 6.2 前端 (character-builder)

- Base URL 配置为 `http://localhost:3000`（或环境变量）
- 请求路径：`/api/2014/{resource}`、`/api/2014/{resource}/{index}`
- 列表解析：`response.count`、`response.results`
- 详情解析：直接使用返回的 JSON 对象，类型与本文档 5.x 节对齐
- `*_en` 字段可选，有则用于英文展示

### 6.3 变更流程

- 接口或字段变更时，优先更新本文档
- 后端实现与文档一致后，前端按文档调整类型与解析逻辑

### 6.4 字段映射表（后端实现）

| 资源 | 数据库字段 | 契约输出字段 | 说明 |
|------|------------|--------------|------|
| Subrace 详情 | `racial_traits` | `traits` | 后端在详情接口进行映射，确保前端按契约读取 |

---

## 7. 参考

- **5e-srd-api 中文说明**：`docs/API_ZH.md`
- **前端类型定义**：`character-builder/src/types/index.ts`

# D&D 5e SRD API 中文文档

本文档基于项目 OpenAPI/Swagger 规范整理并翻译，供中文开发者查阅。

---

## 目录

1. [简介](#1-简介)
2. [快速开始](#2-快速开始)
3. [认证](#3-认证)
4. [GraphQL](#4-graphql)
5. [通用数据结构](#5-通用数据结构)
6. [API 2014（5e 2014 SRD）](#6-api-2014（5e-2014-srd）)
7. [API 2024（2024 SRD）](#7-api-2024（2024-srd）)
8. [常见问题](#8-常见问题)
9. [状态与贡献](#9-状态与贡献)

---

## 1. 简介

欢迎使用 **dnd5eapi**——龙与地下城第五版（D&D 5e）SRD 的 REST API。本文档介绍可用资源及如何通过 HTTP 请求访问。建议先阅读「快速开始」再深入使用。

**服务地址：**

| 环境     | 根地址                     |
|----------|----------------------------|
| 生产环境 | `https://www.dnd5eapi.co`   |
| 本地开发 | `http://127.0.0.1:3000` 或 `http://localhost:3000` |

API 按 SRD 发布年份做版本区分，当前可用：

- **`/api/2014`**：2014 版 5e SRD（完整）
- **`/api/2024`**：2024 版 SRD（部分资源，开发中）

---

## 2. 快速开始

### 2.1 获取所有可用端点

请求 API 根路径可得到当前版本下所有资源端点：

```bash
# 2014 版本
curl -X GET "https://www.dnd5eapi.co/api/2014" -H "Accept: application/json"

# 2024 版本
curl -X GET "https://www.dnd5eapi.co/api/2024" -H "Accept: application/json"
```

**示例响应（2014）：**

```json
{
  "ability-scores": "/api/2014/ability-scores",
  "alignments": "/api/2014/alignments",
  "backgrounds": "/api/2014/backgrounds",
  "classes": "/api/2014/classes",
  "conditions": "/api/2014/conditions",
  "damage-types": "/api/2014/damage-types",
  "equipment-categories": "/api/2014/equipment-categories",
  "equipment": "/api/2014/equipment",
  "feats": "/api/2014/feats",
  "features": "/api/2014/features",
  "languages": "/api/2014/languages",
  "magic-items": "/api/2014/magic-items",
  "magic-schools": "/api/2014/magic-schools",
  "monsters": "/api/2014/monsters",
  "proficiencies": "/api/2014/proficiencies",
  "races": "/api/2014/races",
  "rules": "/api/2014/rules",
  "rule-sections": "/api/2014/rule-sections",
  "skills": "/api/2014/skills",
  "spells": "/api/2014/spells",
  "subclasses": "/api/2014/subclasses",
  "subraces": "/api/2014/subraces",
  "traits": "/api/2014/traits",
  "weapon-properties": "/api/2014/weapon-properties"
}
```

### 2.2 按 index 获取单条资源

资源列表接口返回的每条记录都有 `index` 和 `url`。用 `index` 拼出路径即可获取详情：

```bash
# 获取魅力（Charisma）属性详情
curl -X GET "https://www.dnd5eapi.co/api/2014/ability-scores/cha" -H "Accept: application/json"
```

**示例响应：**

```json
{
  "index": "cha",
  "name": "CHA",
  "full_name": "Charisma",
  "desc": ["魅力衡量你与他人有效互动的能力……"],
  "skills": [
    { "name": "Deception", "index": "deception", "url": "/api/2014/skills/deception" },
    { "name": "Intimidation", "index": "intimidation", "url": "/api/2014/skills/intimidation" }
  ],
  "url": "/api/2014/ability-scores/cha"
}
```

### 2.3 资源列表与查询参数

- 多数端点形如：`GET /api/2014/{资源名}`，返回 `{ count, results: [{ index, name, url }, ...] }`。
- **法术**、**怪物** 支持查询参数过滤，见 [6. API 2014](#6-api-2014（5e-2014-srd）)。

---

## 3. 认证

本 API 完全开放，**不需要认证**即可查询数据。同时仅支持 **GET** 请求读取数据。若发现数据错误，可通过 [Discord](https://discord.gg/TQuYTv7) 反馈。

---

## 4. GraphQL

除 REST 外，API 提供 **GraphQL** 接口：

| 版本 | 地址 |
|------|------|
| 2014 | `https://www.dnd5eapi.co/graphql/2014` |
| 2024 | `https://www.dnd5eapi.co/graphql/2024` |
| 旧版（已弃用） | `https://www.dnd5eapi.co/graphql`（等同于 2014） |

可使用 Apollo Sandbox 等工具探索 Schema 并发送查询。

---

## 5. 通用数据结构

以下为响应中常见的通用类型说明。

### 5.1 APIReference（API 引用）

资源的精简表示，详情需请求 `url` 获取。

| 字段   | 类型   | 说明     |
|--------|--------|----------|
| `index` | string | 资源索引 |
| `name`  | string | 名称     |
| `url`   | string | 详情 URL |

### 5.2 DC（难度等级）

表示一次难度检定（Difficulty Check）。

| 字段          | 类型                    | 说明       |
|---------------|-------------------------|------------|
| `dc_type`     | APIReference            | 检定类型   |
| `dc_value`    | number                  | 难度值     |
| `success_type`| `"none"` \| `"half"` \| `"other"` | 成功类型 |

### 5.3 Damage（伤害）

| 字段          | 类型         | 说明     |
|---------------|--------------|----------|
| `damage_type` | APIReference | 伤害类型 |
| `damage_dice` | string       | 伤害骰   |

### 5.4 Choice（选择）

表示玩家在角色创建或战斗中的选择（如职业熟练项“从若干技能中选 2 个”）。

| 字段   | 类型      | 说明         |
|--------|-----------|--------------|
| `desc` | string    | 描述         |
| `choose` | number  | 需选择数量   |
| `type` | string    | 类型         |
| `from` | OptionSet | 选项集合     |

### 5.5 OptionSet（选项集合）

通过 `option_set_type` 区分结构：

- **`options_array`**：`options` 为 Option 数组。
- **`equipment_category`**：`equipment_category` 引用一个装备分类，其 `equipment` 数组中的每一项为一个选项。
- **`resource_list`**：`resource_list_url` 指向某集合的 URL，返回的 `results` 中每一项为一个选项。

### 5.6 Option（选项）

当为 `options_array` 时，每项为 Option，由 `option_type` 区分，常见取值包括：

- `reference`：引用一个文档（含 `item` APIReference）。
- `action`：动作信息（如多打），含 `action_name`、`count`、`type` 等。
- `multiple`：选中则选中其下所有子选项（`items` 数组）。
- `choice`：嵌套选择（`choice` 为 Choice 结构）。
- `string`：字符串选项。
- `ability_bonus`：属性加值（`ability_score` + `bonus`）。
- `damage`：伤害信息（`damage_type`、`damage_dice`、`notes`）等。

---

## 6. API 2014（5e 2014 SRD）

基础路径：**`/api/2014`**。

### 6.1 通用端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/2014` | 返回本版本下所有资源端点列表 |

### 6.2 资源列表（列表 + 按 index 详情）

以下资源均支持：

- **GET** `/api/2014/{资源名}`：获取列表（返回 `count` + `results`）。
- **GET** `/api/2014/{资源名}/{index}`：按 `index` 获取单条详情。

| 资源名 | 路径示例 | 说明 |
|--------|----------|------|
| 属性值 | `/api/2014/ability-scores` | 六大属性（力量、敏捷等） |
| 阵营 | `/api/2014/alignments` | 阵营 |
| 背景 | `/api/2014/backgrounds` | 角色背景 |
| 职业 | `/api/2014/classes` | 职业 |
| 状态 | `/api/2014/conditions` | 状态（如目盲、中毒） |
| 伤害类型 | `/api/2014/damage-types` | 伤害类型 |
| 装备 | `/api/2014/equipment` | 装备 |
| 装备分类 | `/api/2014/equipment-categories` | 装备分类 |
| 专长 | `/api/2014/feats` | 专长 |
| 特性 | `/api/2014/features` | 通用特性 |
| 语言 | `/api/2014/languages` | 语言 |
| 魔法物品 | `/api/2014/magic-items` | 魔法物品 |
| 魔法学派 | `/api/2014/magic-schools` | 魔法学派 |
| 熟练项 | `/api/2014/proficiencies` | 熟练项 |
| 种族 | `/api/2014/races` | 种族 |
| 规则 | `/api/2014/rules` | 规则 |
| 规则章节 | `/api/2014/rule-sections` | 规则章节 |
| 技能 | `/api/2014/skills` | 技能 |
| 子职业 | `/api/2014/subclasses` | 子职业 |
| 亚种 | `/api/2014/subraces` | 亚种 |
| 特质 | `/api/2014/traits` | 特质 |
| 武器属性 | `/api/2014/weapon-properties` | 武器属性 |

### 6.3 法术（支持查询参数）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/2014/spells` | 法术列表，支持过滤 |
| GET | `/api/2014/spells/{index}` | 按 index 获取法术详情 |

**查询参数（仅列表接口）：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `level` | integer[] | 否 | 法术环阶，如 `level=1` 或 `level=1&level=2` |
| `school` | string[] | 否 | 魔法学派，如 `school=illusion`、`school=evocation` |

### 6.4 怪物（支持查询参数）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/2014/monsters` | 怪物列表，支持过滤 |
| GET | `/api/2014/monsters/{index}` | 按 index 获取怪物详情 |

**查询参数（仅列表接口）：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `challenge_rating` | number[] | 否 | 挑战等级，如 `challenge_rating=1`、`challenge_rating=0.25` |

### 6.5 职业相关子资源

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/2014/classes/{index}` | 职业详情 |
| GET | `/api/2014/classes/{index}/subclasses` | 该职业的子职业列表 |
| GET | `/api/2014/classes/{index}/spells` | 该职业可用法术 |
| GET | `/api/2014/classes/{index}/spellcasting` | 施法规则 |
| GET | `/api/2014/classes/{index}/features` | 职业特性 |
| GET | `/api/2014/classes/{index}/proficiencies` | 熟练项 |
| GET | `/api/2014/classes/{index}/multi-classing` | 多职业规则 |
| GET | `/api/2014/classes/{index}/levels` | 等级列表 |
| GET | `/api/2014/classes/{index}/levels/{class_level}` | 指定等级详情 |
| GET | `/api/2014/classes/{index}/levels/{class_level}/features` | 该等级获得的特性 |
| GET | `/api/2014/classes/{index}/levels/{spell_level}/spells` | 该等级法术位对应法术 |

### 6.6 种族相关子资源

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/2014/races/{index}` | 种族详情 |
| GET | `/api/2014/races/{index}/subraces` | 该种族的亚种 |
| GET | `/api/2014/races/{index}/proficiencies` | 熟练项 |
| GET | `/api/2014/races/{index}/traits` | 种族特质 |

### 6.7 子职业相关子资源

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/2014/subclasses/{index}` | 子职业详情 |
| GET | `/api/2014/subclasses/{index}/features` | 子职业特性 |
| GET | `/api/2014/subclasses/{index}/levels` | 等级列表 |
| GET | `/api/2014/subclasses/{index}/levels/{subclass_level}` | 指定等级详情 |
| GET | `/api/2014/subclasses/{index}/levels/{subclass_level}/features` | 该等级特性 |

### 6.8 可选：按 name 查询

部分实现支持通过查询参数 `name` 做模糊或精确过滤（具体以实际响应为准），例如：

- `GET /api/2014/classes?name=barbarian`

---

## 7. API 2024（2024 SRD）

基础路径：**`/api/2024`**。当前仅包含部分资源，其余与 2014 类似的结构会陆续补齐。

### 7.1 通用端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/2024` | 返回 2024 版本下所有可用资源端点 |

### 7.2 当前可用资源（列表 + 按 index 详情）

| 资源名 | 路径示例 | 说明 |
|--------|----------|------|
| 属性值 | `/api/2024/ability-scores` | 属性 |
| 阵营 | `/api/2024/alignments` | 阵营 |
| 状态 | `/api/2024/conditions` | 状态 |
| 伤害类型 | `/api/2024/damage-types` | 伤害类型 |
| 装备 | `/api/2024/equipment` | 装备 |
| 装备分类 | `/api/2024/equipment-categories` | 装备分类 |
| 语言 | `/api/2024/languages` | 语言 |
| 魔法学派 | `/api/2024/magic-schools` | 魔法学派 |
| 技能 | `/api/2024/skills` | 技能 |
| 武器属性 | `/api/2024/weapon-properties` | 武器属性 |
| 武器精通属性 | `/api/2024/weapon-mastery-properties` | 2024 新增：武器精通属性 |

用法与 2014 一致：

- `GET /api/2024/{资源名}` → 列表
- `GET /api/2024/{资源名}/{index}` → 详情

---

## 8. 常见问题

### 什么是 SRD？

SRD（Systems Reference Document）是在 OGL 下发布内容时使用的参考文档，使部分 D&D 5e 数据可以开源使用。本 API 仅包含 SRD 范围内的数据。[SRD 全文链接](https://media.wizards.com/2016/downloads/DND/SRD-OGL_V5.1.pdf)。

### 什么是 OGL？

OGL（Open Game License）是威世智的公开版权许可，允许对桌面角色扮演游戏内容进行修改、复制与再分发（需遵守“相同方式共享”等条款）。[更多信息](https://en.wikipedia.org/wiki/Open_Game_License)。

### 某个怪物、法术、子职业等在 API 里找不到，可以加吗？

请先确认该内容是否属于 SRD。若在 SRD 内，欢迎提 Issue 或 PR；若不在，因版权原因无法加入。

### 可以自托管吗？

可以。你也可以只自托管数据而不用本 API，或自行修改、扩展数据，但需要自行合并上游的数据与 API 更新。

### 可以在某某平台发布 / 商用吗？

可以。API 代码采用 [MIT 许可证](https://opensource.org/licenses/MIT)，通过 API 获取的数据受 SRD 与 OGL 支持。

---

## 9. 状态与贡献

- **状态页**：https://5e-bits.github.io/dnd-uptime/
- **交流**：[Discord](https://discord.gg/TQuYTv7)
- **数据仓库**：https://github.com/5e-bits/5e-database
- **API 仓库**：https://github.com/5e-bits/5e-srd-api

欢迎通过 Issue、PR 或 Discord 参与改进。

---

**文档版本**：基于 5e-srd-api 项目 OpenAPI 规范整理，最后更新与项目 Swagger 一致。

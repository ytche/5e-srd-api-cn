# 前后端联调计划

> 基于 [API_CONTRACT.md](./API_CONTRACT.md) 的联调检查清单与执行顺序。适用于 5e-srd-api 与 character-builder 首次对接及回归验证。

**维护位置**：5e-srd-api 仓库

---

## 1. 联调前提

### 1.1 环境

| 项目 | 要求 |
|------|------|
| 5e-srd-api | 已启动（含 5e-database），可访问 `http://localhost:3000/api/2014` |
| character-builder | 已配置 Base URL 指向上述地址（或环境变量），可发起请求 |

### 1.2 契约约定（联调基准）

- 字段：**snake_case**
- 响应：**裸 JSON**，无 `{ code, message, data }` 包装
- 列表：`{ count: number, results: Array<{ index, name, url }> }`
- 详情：完整资源对象，中英字段有则返回
- 404：`{ "error": "Not found" }`

### 1.3 建议顺序

先做**通用与错误场景**，再按**车卡步骤**逐步验证，每步包含：列表结构 → 详情字段 → 子资源（若有）。

---

## 2. 第零步：通用与错误语义

在按业务步骤联调前，先确认基础行为一致。

| 项 | 请求 | 验证点 |
|----|------|--------|
| 索引 | `GET /api/2014` | 返回对象，含 `classes`、`races`、`spells` 等键，值为路径字符串 |
| 列表结构 | `GET /api/2014/races` | `count` 为数字，`results` 为数组；每项含 `index`、`name`、`url` |
| 详情存在 | `GET /api/2014/races/dwarf` | 200，JSON 含 `index`、`name`、`speed`、`ability_bonuses` 等 |
| 404 资源 | `GET /api/2014/races/nonexistent-id` | 404，Body 含 `error: "Not found"`（或与契约一致） |
| 404 子资源 | `GET /api/2014/classes/nonexistent/subclasses` | 404，同上 |

前端可先写一个「健康检查」或「联调页」：请求索引 + 一个列表 + 一个详情 + 一个 404，全部符合再进入步骤联调。

---

## 3. 按车卡步骤的联调清单

以下按 character-builder 的 8 步车卡流程排列，每步列出涉及的接口与验证要点。

### 步骤 1：战役设置

| 说明 | 接口 | 验证点 |
|------|------|--------|
| 规则版本/扩展书 | 无 | 契约未定义，由前端硬编码；联调可跳过接口，仅确认前端流程可进入下一步 |

---

### 步骤 2：选择种族

| 说明 | 接口 | 验证点 |
|------|------|--------|
| 种族列表 | `GET /api/2014/races` | `count`、`results`；每项 `index`、`name`、`url` |
| 种族详情 | `GET /api/2014/races/{index}` | 含 5.1 节字段：`ability_bonuses`、`languages`、`traits`、`subraces`、`starting_proficiencies`、`starting_proficiency_options` 等；`name` 中文、`name_en` 可选 |
| 亚种列表 | `GET /api/2014/races/{index}/subraces` | 列表结构 `{ count, results }` |
| 亚种详情 | `GET /api/2014/subraces/{index}` | 含 5.2 节字段；**映射**：返回为 `traits`（非 `racial_traits`） |
| 语言（若从详情外单独拉） | `GET /api/2014/languages` | 列表结构 |
| 特质（若按 index 拉详情） | `GET /api/2014/traits/{index}` | 详情含 `name`、`desc` 等 |

**前端验证重点**：列表能渲染、点选后详情能展示；亚种详情用 `traits` 展示特质列表。

---

### 步骤 3：选择职业

| 说明 | 接口 | 验证点 |
|------|------|--------|
| 职业列表 | `GET /api/2014/classes` | 列表结构 |
| 职业详情 | `GET /api/2014/classes/{index}` | 含 5.3 节：`proficiency_choices`、`proficiencies`、`starting_equipment`、`starting_equipment_options`、`subclasses`、`spellcasting` 等 |
| 子职业列表 | `GET /api/2014/classes/{index}/subclasses` | 列表结构 |
| 子职业详情 | `GET /api/2014/subclasses/{index}` | 含 5.4 节：`class`、`desc`、`subclass_levels` 等 |
| 起始装备 | `GET /api/2014/classes/{index}/starting-equipment` | 与契约 3.4、5.3 中结构一致 |
| 熟练项 | `GET /api/2014/classes/{index}/proficiencies` | 列表或结构化数据 |
| 施法信息 | `GET /api/2014/classes/{index}/spellcasting` | 含 `level`、`spellcasting_ability`、`info` |
| 可选法术列表 | `GET /api/2014/classes/{index}/spells` | 可选 `?level=1,2` |
| 等级列表/单级 | `GET /api/2014/classes/{index}/levels`、`/levels/{level}` | 按契约 4.3 |

**前端验证重点**：职业/子职业选择、熟练项选择、起始装备与可选装备展示正常。

---

### 步骤 4：分配属性

| 说明 | 接口 | 验证点 |
|------|------|--------|
| 属性列表 | `GET /api/2014/ability-scores` | 列表结构；用于展示六大属性名称与描述 |
| 属性详情 | `GET /api/2014/ability-scores/{index}` | 含 5.8 节：`full_name`、`desc`、`skills` |

**前端验证重点**：购点/掷骰仅用前端逻辑；若展示属性说明，请求详情能正确解析。

---

### 步骤 5：选择背景

| 说明 | 接口 | 验证点 |
|------|------|--------|
| 背景列表 | `GET /api/2014/backgrounds` | 列表结构 |
| 背景详情 | `GET /api/2014/backgrounds/{index}` | 含 5.5 节：`starting_proficiencies`、`starting_equipment`、`feature`、`personality_traits`、`ideals`、`bonds`、`flaws` |
| 阵营（若单独拉） | `GET /api/2014/alignments` | 列表结构 |

**前端验证重点**：背景选择、背景特性与装备、阵营九宫格展示正常。

---

### 步骤 6：选择法术

| 说明 | 接口 | 验证点 |
|------|------|--------|
| 法术列表 | `GET /api/2014/spells` | 列表结构；支持查询参数（契约 4.2） |
| 法术详情 | `GET /api/2014/spells/{index}` | 含 5.6 节：`level`、`school`、`classes`、`desc`、`casting_time`、`components` 等 |
| 职业可选法术 | `GET /api/2014/classes/{index}/spells?level=1,2` | 按契约 4.3 |
| 法术学派（若筛选用） | `GET /api/2014/magic-schools` | 列表结构 |

**前端验证重点**：按职业/等级拉法术、法术详情弹窗或详情页展示正确。

---

### 步骤 7：起始装备

| 说明 | 接口 | 验证点 |
|------|------|--------|
| 装备列表/分类 | `GET /api/2014/equipment`、`/api/2014/equipment-categories` | 列表结构 |
| 装备详情 | `GET /api/2014/equipment/{index}` | 能解析名称、数量等；契约未单独列 5.x 可沿用通用详情 |
| 职业起始装备 | 步骤 3 已覆盖 | 与「待选选择」逻辑一致 |

**前端验证重点**：职业/背景带来的起始装备与可选装备选项展示、选择后写入角色状态正常。

---

### 步骤 8：确认角色

| 说明 | 接口 | 验证点 |
|------|------|--------|
| 无新接口 | — | 汇总数据来自前序步骤；可抽查前序详情接口在「回顾页」中展示的字段是否与契约一致 |

**前端验证重点**：角色卡预览页展示的种族、职业、属性、背景、法术、装备等与所选一致，且无缺字段导致的报错或空白。

---

## 4. 联调执行建议

1. **环境就绪**：后端起好、前端 Base URL 指向后端，先跑完「第零步」通用与 404。
2. **按步骤串行**：从步骤 2 开始，每步先列表再详情再子资源；某步失败可先记录再继续，避免阻塞整体。
3. **抽样即可**：列表/详情不必每个 index 都测，每类资源抽 1～2 个即可，重点看结构与关键字段。
4. **问题记录**：建议格式：`[步骤X] 接口 GET /api/2014/xxx — 现象（如缺字段/格式不符）— 期望（契约 2.1/5.x）`，便于前后端对齐修复。
5. **回归**：契约或后端变更后，可按本文档再做一轮联调，重点回归曾出问题的步骤。

---

## 5. 验收标准（联调通过）

- 第零步：索引、列表结构、详情、404 行为均符合契约。
- 步骤 2～7：对应列表与详情（及子资源）可被前端正确请求并解析，页面无因字段缺失或格式不符导致的报错或空白。
- 步骤 8：完整走通一次车卡流程，确认页展示与选择一致。

---

## 6. 参考

- 契约正文：[API_CONTRACT.md](./API_CONTRACT.md)
- 车卡 8 步与前端类型：character-builder 项目 `docs/UI_REQUIREMENTS.md`、`src/types`（若有）

# races 与 subraces 对照表（人工校验用）

> 数据来源：`GET /api/2014/races`、`GET /api/2014/subraces`，以及各 `GET /api/2014/races/{index}` 详情中的 `subraces` 数组。  
> 对比逻辑：亚种列表中的每条 subrace 均通过其详情中的 `race` 字段归属到某一种族；若该种族详情里的 `subraces` 数组中未包含该亚种，则记为「该种族缺失该亚种」。

---

## 1. 种族当前包含的亚种（API 返回）

| 种族 (race) | API index | 当前 race 详情中的 subraces |
|-------------|-----------|-----------------------------|
| 龙裔 | dragonborn | （无） |
| 矮人 | dwarf | hill-dwarf（丘陵矮人） |
| 精灵 | elf | high-elf（高等精灵） |
| 侏儒 | gnome | rock-gnome（岩侏儒） |
| 半精灵 | half-elf | （无） |
| 半兽人 | half-orc | （无） |
| 半身人 | halfling | lightfoot-halfling（轻足半身人） |
| 人类 | human | （无） |
| 提夫林 | tiefling | （无） |

---

## 2. 亚种列表中缺失的亚种（race 详情中未包含）

以下亚种在 `GET /api/2014/subraces` 中存在，且其详情中 `race` 指向对应种族，但该种族的详情接口返回的 `subraces` 数组中**未包含**该亚种，需在对应 race 的 `subraces` 中补全引用。

| 种族 (race) | 缺失的亚种 (subrace) | API index | 中文名 | 校验结论（人工填写） |
|-------------|----------------------|-----------|--------|----------------------|
| 矮人 (dwarf) | mountain-dwarf | mountain-dwarf | 高山矮人 |  |
| 精灵 (elf) | wood-elf | wood-elf | 木精灵 |  |
| 精灵 (elf) | drow | drow | 卓尔 |  |
| 侏儒 (gnome) | forest-gnome | forest-gnome | 森林侏儒 |  |
| 半身人 (halfling) | stout-halfling | stout-halfling | 壮硕半身人 |  |

---

## 3. 汇总

| 项目 | 数量 |
|------|------|
| 亚种列表 (subraces) 总数 | 9 |
| 已出现在各 race 详情 subraces 中的亚种 | 4（hill-dwarf, high-elf, rock-gnome, lightfoot-halfling） |
| **缺失的亚种（需补全到对应 race 的 subraces）** | **5**（mountain-dwarf, wood-elf, drow, forest-gnome, stout-halfling） |

---

## 4. 操作建议

1. 在数据库或 API 中，将上述 5 个亚种的引用加入其对应种族文档的 `subraces` 数组。
2. 补全后重新请求 `GET /api/2014/races/{index}`，确认各亚种均出现在对应种族的 `subraces` 中。
3. 若某亚种依规则不应出现在某种族下，请在「校验结论」列注明并决定是否从 subraces 列表或 race 关联中调整。

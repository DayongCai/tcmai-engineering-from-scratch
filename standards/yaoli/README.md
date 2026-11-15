# 药理学 · 底本与编写约定

> 学科：`departments/09-jichu/12-yaoli-xue`（基础医学院 · 第 4 学期 · 54 学时 · 49 章）

## 一、底本（真教材，不是代用底本）

| 项 | 值 |
|---|---|
| 文件 | `E:/textbooks/qhzy-药理学.xlsx` |
| 结构 | **9 篇 · 49 章 · 196 节 · 588 小节 · 588 段** |
| 汉字 | **971,179**（章正文口径，现算） |
| 量值 | **421 处**（剂量／浓度／时间，带单位） |
| 抽取 | `python scripts/build_yaoli_diben.py` → `standards/yaoli/底本.json` |
| 源声明 | 结构照全国中医药行业高等教育「十四五」规划教材《药理学》第五版，章名章序与底本一致 |

与病理生理学（代用底本《疾病学基础》）**不同**：这一门**有真教材**，所以引文按「教材」口径写，
不写「底本·」，也不写「外源·」。

## 二、引文格式

```
「逐字引语，≥6 字，必须能在该小节原文里 find 到」——教材·药理学·第2章·2.3.1
```

- 三级 locator = **章.节.小节**，例如 `第2章·2.3.1`，不带第四级段号；
- 章号必须等于本章；节号／小节号必须真实存在于 `底本.json`（门会逐条回查）；
- 每章 ≥6 条；引语一律用「」，不许改写、不许拼接两句。

## 三、数值口径：B 支（教材带量值）

底本含剂量，所以走 B 支（`scripts/lib_value_caliber.js`）：

| 情形 | 判 |
|---|---|
| 引文行（带 `教材·药理学·第N章·M.K.L`）里的量值 | **放行**（原文如此） |
| 正文（非引文行）裸写 mg / ml / mmol / 次／日 / 分钟 等 | **判红** |
| 把教材剂量改写成「正常值 / 参考区间」 | **判红**（且缺边界声明即红） |

正文要谈剂量时只有一种写法：**「剂量与用法照底本」**，并保证该章出现一次边界声明
（`剂量与用法照底本` / `不作适用性判断` / `不构成用药建议` 之一）。

## 四、章级契约（6 文件）

`departments/09-jichu/12-yaoli-xue/chapters/<slug>/`

| 文件 | 要求 |
|---|---|
| `docs/zh.md` | 3,000–14,000 非空白字；12 个小节号逐个出现；≥6 条逐字引语；含「十二个小节：逐条落位」「代价与边界」「运行与验证」与免责句 |
| `quiz.json` | 恰好 6 题：pre / check×3 / post×2；题干键 `question`；每题带 `cite` |
| `code/main.js` | 可直接跑，末行打印「教学边界：……不构成用药建议」 |
| `code/main.test.js` | `node --test code/main.test.js` 全过，断言落在可复算结构上 |
| `outputs/prompt-<slug>.md` | ≥300 非空白字 |
| `outputs/skill-<slug>.md` | frontmatter：`name`（= slug 去章号前缀）/ `description` / `version` |

## 五、门

| 门 | 管什么 |
|---|---|
| `tests/test_yaoli_chapters.js` | 49 章全量：文件齐 · 引文逐字 · locator 真 · 12 小节覆盖 · 规模 · quiz · outputs · 单测 · B 支数值 |
| `scripts/check_yaoli_chapter.js` | 写稿期单章体检（同一套判据，缩小范围） |

## 六、不要做的事

- 不要按 `textbooks/09-jichu/12-yaoli-xue/*.md` 整段照搬：那是**源正文层**（一字未改的底本），
  课程章是**加工层**，要选、要组织、要给出本仓立场。
- 不要把底本里的小节号当装饰：**12 个小节号都必须真的被讲到**，否则等于绕开底本自己编。
- 不要写疗效断言、适应证判定、药物优劣排序；这些底本本身也不写（约束句在 `底本.json` 的 `brief` 字段）。

## 七. 单元层（units.json，2026-11-13 补）

| 项 | 值 |
|---|---|
| 切分 | 一小节一单元：章＝底本章，节＝底本节，小节＝单元 |
| 规模 | **588 单元** · 49 章 · 971,179 汉字 |
| locator | `教材·第N章·N.M.K`，沿用底本四级编号，可逐字回查 `底本.json` |
| 轴 | **不设三辨/四位面**：本底本没有那套编排，硬套一套词表算出来的是脚本的轴，不是教材的轴。只带 `measure`（digits / valueLike / listItems）与 `counts` |
| 重建 | `python scripts/build_textbook_units.py yaoli`；校验 `python scripts/build_textbook_units.py --check`（已并入 `npm run check`） |

为什么补这一层（不是格式洁癖）：本课此前只有「底本 + 正文」两层，`standards/yaoli/units.json` 缺席，
`scripts/build_kt_sphere_data.py` 与 `scripts/build_kt_history.py` 只扫 `standards/*/units.json`，
于是知识树与语义张量球面把本课记成**单元 0**——内容在库里，却不在统计口径里。
补上之后知识点按「一节一单元」进树，`brief` 取底本条目名（`items`），`goals` 取正文里的【学习目标】。

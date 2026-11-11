# 药理学

**12-yaoli-xue** · 基础医学院 · 49 章 · 588 小节 · 底本 971,179 汉字

> 药理学的判据是「靶点—效应—风险」三件套：说得出靶点，才说得清不良反应。

## 一、底本与规模

| 项 | 值 |
|---|---|
| 教材 | `F:/textbooks/qhzy-药理学.xlsx` |
| 结构化底本 | `standards/yaoli/底本.json`（49 章 / 196 节 / 588 小节 / 971,179 汉字 / 量值 421 处） |
| 章节目标 | 49（**1:1 对应教材，无合并拆分，无单元复用**） |
| 课程正文 | 49 章 docs 合计 **564,705 非空白字**（每章 9,243–14,226，门的上限 15,000） |

## 二、这门课的写法（与「教材搬字」的区别）

每章 4 节 12 小节，正文按「问题 → 机制链 → 判据 → 记录」组织，不逐句复述教材：

1. **引文逐字**：每章 ≥6 条引文用「」括起，同一行标 `教材·药理学·第N章·M.K.L` 三级出处，回查不到就不引；
2. **非引文行不写量值**：剂量、浓度、时程一律写「剂量与用法照底本」，量值只允许出现在带出处的引文行（见 `## 代价与边界`）；
3. **可复算**：每章 `code/main.js` 读底本现算规模与词频，`code/main.test.js` 六项单测把关。

## 三、章表（章 / slug / 篇 / 正文非空白字）

| # | slug | 篇 | 正文 |
|--:|---|---|--:|
| 1 | 01-introduction |  | 11,131 |
| 2 | 02-pharmacodynamics |  | 11,740 |
| 3 | 03-pharmacokinetics |  | 12,425 |
| 4 | 04-factors-affecting-drug-response |  | 13,273 |
| 5 | 05-autonomic-nervous-system-overview |  | 13,920 |
| 6 | 06-cholinergic-agonists |  | 9,928 |
| 7 | 07-organophosphates-and-cholinesterase-reactivating-agents |  | 9,894 |
| 8 | 08-cholinergic-antagonists |  | 11,274 |
| 9 | 09-adrenergic-agonists |  | 9,393 |
| 10 | 10-adrenergic-antagonists |  | 10,727 |
| 11 | 11-local-anesthetics |  | 10,860 |
| 12 | 12-general-anesthetics |  | 10,506 |
| 13 | 13-sedative-hypnotics |  | 10,391 |
| 14 | 14-antiepileptic-and-anticonvulsant-drugs |  | 11,462 |
| 15 | 15-antipsychotic-drugs |  | 9,263 |
| 16 | 16-drugs-for-neurodegenerative-diseases |  | 9,783 |
| 17 | 17-antipyretic-analgesic-and-anti-inflammatory-drugs |  | 12,135 |
| 18 | 18-opioid-analgesics |  | 11,461 |
| 19 | 19-central-nervous-system-stimulants |  | 11,718 |
| 20 | 20-histamine-and-antihistamines |  | 10,674 |
| 21 | 21-other-autacoid-drugs |  | 11,940 |
| 22 | 22-drugs-acting-on-cardiovascular-ion-channels |  | 10,833 |
| 23 | 23-drugs-for-chronic-heart-failure |  | 11,811 |
| 24 | 24-antihypertensive-drugs |  | 13,484 |
| 25 | 25-antianginal-drugs |  | 9,198 |
| 26 | 26-antiarrhythmic-drugs |  | 10,076 |
| 27 | 27-antiatherosclerotic-drugs |  | 10,693 |
| 28 | 28-diuretics-and-dehydrating-agents |  | 9,893 |
| 29 | 29-gastrointestinal-drugs |  | 11,027 |
| 30 | 30-respiratory-system-drugs |  | 8,979 |
| 31 | 31-uterine-stimulants |  | 9,511 |
| 32 | 32-antianemic-drugs |  | 9,156 |
| 33 | 33-drugs-affecting-coagulation |  | 9,415 |
| 34 | 34-adrenocortical-hormones |  | 11,308 |
| 35 | 35-thyroid-hormones-and-antithyroid-drugs |  | 12,485 |
| 36 | 36-antihyperglycemic-drugs |  | 13,036 |
| 37 | 37-sex-hormones-and-contraceptives |  | 13,580 |
| 38 | 38-antimicrobial-drugs-overview |  | 13,665 |
| 39 | 39-synthetic-antibacterial-drugs |  | 13,960 |
| 40 | 40-beta-lactam-antibiotics |  | 10,709 |
| 41 | 41-macrolides-lincosamides-and-polypeptide-antibiotics |  | 10,021 |
| 42 | 42-aminoglycoside-antibiotics |  | 11,167 |
| 43 | 43-tetracyclines-and-chloramphenicol |  | 11,691 |
| 44 | 44-antifungal-and-antiviral-drugs |  | 13,683 |
| 45 | 45-antituberculosis-and-antileprosy-drugs |  | 9,946 |
| 46 | 46-antiparasitic-drugs |  | 10,366 |
| 47 | 47-anticancer-drugs |  | 12,394 |
| 48 | 48-immunosuppressants |  | 12,594 |
| 49 | 49-immunostimulants |  | 13,088 |

## 四、门

| 门 | 命令 | 判据 |
|---|---|---|
| 章门 | `node tests/test_yaoli_chapters.js` | 11 项：6 文件齐 / 引文逐字回查 / 三级 locator 与章号对得上 / 12 小节号全在 / 篇幅 / quiz 六题与阶段 / outputs 与 skill frontmatter / 章内单测与末行边界 / 数值口径 B 支 / 旁白层 / 成片时长 |
| 全库门 | `npm run check` | 含 `audit_curriculum`、`test_chapter_code`、`yaoli:yaml:check` |

**免责声明：** 本课为教学材料。剂量、给药间隔、特殊人群用法一律以现行药典与药品说明书为准；本课只讲机制与风险，不构成用药建议。

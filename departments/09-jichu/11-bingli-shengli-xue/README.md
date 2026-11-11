# 病理生理学

> 病机演变→状态机 / 代偿失调→阈值模型

| 项目 | 内容 |
|------|------|
| 院系 | 🧬 基础医学院 `09-jichu` |
| 类型 | Core |
| 学期 | 第 4 学期（🌱 生·启蒙 / 大一–大二） |
| 学时 | 54 |
| 章节目标 | 53 |
| 学科编号 | 131 / 135 |
| 英文名 | Pathophysiology |

## 一、学科定位

病理生理学（Pathophysiology）是基础医学院的核心学科，聚焦「形态 · 功能 · 病理 · 药理四条基线：中医概念落地前必须先有的正常与异常人体图景」中的一个完整知识域。

## 二、中医 → AI 桥梁

```text
病机演变→状态机 / 代偿失调→阈值模型
```

病理生理学 里的每一个传统概念，都被翻译成一个可计算、可验证的工程对象：
中医概念给出**语义与约束**，AI/工程方法给出**表示与算法**。两者必须能互相回指，
否则这个章节就还没有写完。

## 三、章节地图（53 章 · 15 单元）

**这一门的第一文本是本仓库自己的讲义** `standards/binglishengli/supplements/jiangyi/`（15 单元 53 章、
599 节、214,666 字），课程章目与它一一对应。代用底本《疾病学基础》降为**素材层**：
它只有 18 章、且缺生殖/神经/精神心理/骨骼肌肉/皮肤五大块，撑不起 53 章。

原「传统 14 章」的一批稿子（绪论、水电解质、酸碱、缺氧、发热、应激、休克、DIC、心/肺/肝/肾）
已归档到 `standards/binglishengli/legacy-14-chapters/`，映射见 `chapters-legacy-map.json`。它们不参与计数、不再被门检查，
但内容可作素材——**别把它们当现役章节引用**。

## 四、章节契约（每章必须满足）

```text
chapters/NN-<slug>/
├── docs/zh.md      # MOTTO / PROBLEM / 环境逼迫 / 知识积累 / CONCEPT / BUILD IT / USE IT / SHIP IT
├── code/           # 可运行、自终止、退出码 0（Node.js 或 Python，见 CONTRIBUTING.md 依赖白名单）
├── quiz.json       # 恰好 6 题 = 1 pre + 3 check + 2 post
└── outputs/        # 可复用产出物（prompt / skill / agent / mcp / 临床工具）
```

## 五、教材交付 [textbooks]

```text
输出: textbooks/09-jichu/11-bingli-shengli-xue/
├── 00-前言.md              # 契约对照表 + 53 章清单（字数现算）
├── 01-第1章-<标题>.md ...  # 53 篇，源正文层
└── figures/                # 待建（Mermaid / SVG，禁止 ASCII 框图）
```

**当前层次：源正文层（53/53 章）**。来源是讲义（本仓原创），**不是教材原文**——
本机没有《病理生理学》教材，讲义按 Pathophysiology 8th ed. 的目录结构原创编写。
每篇头部写着真实出处、sha256 与现算字数；`python scripts/build_binglishengli_textbook.py --check`
逐字比对，讲义改了没重渲染即报漂移。

改写层（N.1 概念与出处 → N.5 争议与本项目立场 + 思考题 + 延伸阅读）**53/53 章已写完**，
每章 1,840–2,200 汉字；写法以首批五章（第 1、2、19、20、48 章）为基准。改写层写在
`<!-- REWRITE:BEGIN/END -->` 块里，渲染脚本整块保留、不覆盖。

图：**35 章**配了 Mermaid（链条 / 环 / 三层结构），其余章节不适合画图（如系谱、管道分化用表更清）。
契约要求「图只用 Mermaid 或 SVG」，门会核图型合法、行数够、无 ASCII 框线。
前言里有一张契约对照表，明写哪几节是 ⬚ 待撰写，不把源正文冒充成品。

## 六、平台交付 [tcmP]

```text
输出: platform/courses/09-jichu/11-bingli-shengli-xue/
├── course.yaml             # 53 章 · 全部 slides-ready（估计时长来自 lesson.json）
├── <slug>/narration/lesson.json   # 53 章齐 · 分镜脚本（只有文本与分段，无音频）
├── <slug>/slides/index.html       # 53 章齐 · 单文件离线幻灯片（← → 翻页，p 打印 PDF）
└── <slug>/video/           # 成片 MP4 · 待建
```

**当前层次：rendered（53/53 章成片 · 22.6 小时 · 2.12 GB）**。旁白由 `platform/pipeline/extract_narration.js` 从 `docs/zh.md`
切出，**不生成音频**：`estimateSeconds` 是按 4.6 字/秒的排期估算，字段名与 `estimateNote` 都明写「估算」，
真实时长必须来自 TTS 返回或 ffprobe——两者混用是这类项目最常见的造假点。

本册 docs 用「一、二、三…」中文序号结构，不套仓库默认的七段模板，所以学科目录下有一份
`narration-map.json`（`sequential: true` + 按标题**含词**匹配，不是前缀——序号在前会让前缀匹配全漏，
第一版就是这么漏掉 4 章「代价与边界」段的）。

`course.yaml` 由 `python scripts/build_binglishengli_course_yaml.py` 从 `chapters.json` 渲染，
`--check` 比对漂移。**它不写 `estimate_minutes` / `measured_minutes`**：那两个字段的语义是
「对 `narration/lesson.json` 的实测值」，现在没有 lesson.json，写了就是编数。

## 七、进度

| 指标 | 当前 | 目标 |
|------|------|------|
| 章节 | 53 | 53 |
| 旁白（narration） | **53 章 · 1,383 分钟（估算）** | 53 章 |
| 幻灯片（slides） | **53 章 · 1,526 片**（拆长段后） | 53 章 |
| 视频 | 0 | 53 |
| 教材（源正文层） | **53 章 / 301,093 汉字** | 53 章 |
| 教材（改写层 N.1–N.5） | **53 章 / 全册** | 53 章 |
| 教材（Mermaid 图） | 35 章 | — |

> 每章 6 文件：`docs/zh.md` · `quiz.json`（6 题）· `code/main.js` · `code/main.test.js` ·
> `outputs/prompt-<slug>.md` · `outputs/skill-<slug>.md`。门 `tests/test_binglishengli_chapters.js`
> 核的是**讲义引文逐字可查 + 讲义每节都在 docs 出现 + 正文零裸值 + quiz 每题带引证**。

> 状态字形：🌱 未开始 ⬚ · 🚧 进行中 · ✅ 完成

<!-- BSLJ53:BEGIN -->
| 章 | 标题 | slug | 正文非空白字 |
|--:|---|---|--:|
| **U01（2 章）** | | | |
| 1 | 病理生理学导论 | `01-introduction-to-pathophysiology` | 10,335 |
| 2 | 稳态、异稳态与对应激源的适应性反应 | `02-homeostasis-allostasis-and-adaptive-responses-to-stressors` | 9,638 |
| **U02（5 章）** | | | |
| 3 | 细胞结构与功能 | `03-cell-structure-and-function` | 7,671 |
| 4 | 细胞损伤、衰老与死亡 | `04-cell-injury-aging-and-death` | 8,443 |
| 5 | 基因组结构、调控与组织分化 | `05-genome-structure-regulation-and-tissue-differentiation` | 7,336 |
| 6 | 遗传与发育性疾病 | `06-genetic-and-developmental-disorders` | 8,735 |
| 7 | 肿瘤 | `07-neoplasia` | 8,695 |
| **U03（5 章）** | | | |
| 8 | 感染过程 | `08-infectious-processes` | 8,917 |
| 9 | 炎症与免疫 | `09-inflammation-and-immunity` | 9,309 |
| 10 | 免疫功能异常 | `10-alterations-in-immune-function` | 9,697 |
| 11 | 白细胞恶性肿瘤 | `11-malignant-disorders-of-white-blood-cells` | 8,674 |
| 12 | HIV感染与艾滋病 | `12-hiv-disease-and-aids` | 8,951 |
| **U04（4 章）** | | | |
| 13 | 氧运输异常 | `13-alterations-in-oxygen-transport` | 9,567 |
| 14 | 止血与凝血异常 | `14-alterations-in-hemostasis-and-blood-coagulation` | 9,819 |
| 15 | 血流异常 | `15-alterations-in-blood-flow` | 8,444 |
| 16 | 血压异常 | `16-alterations-in-blood-pressure` | 8,300 |
| **U05（4 章）** | | | |
| 17 | 心脏功能 | `17-cardiac-function` | 9,404 |
| 18 | 心脏功能异常 | `18-alterations-in-cardiac-function` | 8,440 |
| 19 | 心力衰竭与心律失常 | `19-heart-failure-and-dysrhythmias` | 9,627 |
| 20 | 休克 | `20-shock` | 9,175 |
| **U06（3 章）** | | | |
| 21 | 呼吸功能与气体交换异常 | `21-respiratory-function-and-alterations-in-gas-exchange` | 10,373 |
| 22 | 阻塞性肺疾病 | `22-obstructive-pulmonary-disorders` | 10,575 |
| 23 | 限制性肺疾病 | `23-restrictive-pulmonary-disorders` | 9,089 |
| **U07（2 章）** | | | |
| 24 | 水电解质稳态与失衡 | `24-fluid-and-electrolyte-homeostasis-and-imbalances` | 10,493 |
| 25 | 酸碱平衡与失衡 | `25-acid-base-homeostasis-and-imbalances` | 9,351 |
| **U08（4 章）** | | | |
| 26 | 肾脏功能 | `26-renal-function` | 10,470 |
| 27 | 肾内疾病 | `27-intrarenal-disorders` | 7,657 |
| 28 | 急性肾损伤与慢性肾脏病 | `28-acute-kidney-injury-and-chronic-kidney-disease` | 8,246 |
| 29 | 下尿路疾病 | `29-disorders-of-the-lower-urinary-tract` | 8,308 |
| **U09（5 章）** | | | |
| 30 | 男性生殖功能 | `30-male-genital-and-reproductive-function` | 8,843 |
| 31 | 男性生殖功能异常 | `31-alterations-in-male-genital-and-reproductive-function` | 8,003 |
| 32 | 女性生殖功能 | `32-female-genital-and-reproductive-function` | 8,106 |
| 33 | 女性生殖功能异常 | `33-alterations-in-female-genital-and-reproductive-function` | 8,969 |
| 34 | 性传播感染 | `34-sexually-transmitted-infections` | 8,390 |
| **U10（4 章）** | | | |
| 35 | 胃肠功能 | `35-gastrointestinal-function` | 8,401 |
| 36 | 胃肠疾病 | `36-gastrointestinal-disorders` | 9,717 |
| 37 | 胆囊与外分泌胰腺功能异常 | `37-alterations-in-function-of-the-gallbladder-and-exocrine-pancreas` | 8,315 |
| 38 | 肝脏疾病 | `38-liver-diseases` | 9,089 |
| **U11（4 章）** | | | |
| 39 | 内分泌生理与下丘脑-垂体调控机制 | `39-endocrine-physiology-and-mechanisms-of-hypothalamic-pituitary-regulation` | 9,677 |
| 40 | 内分泌功能紊乱 | `40-disorders-of-endocrine-function` | 9,370 |
| 41 | 糖尿病 | `41-diabetes-mellitus` | 10,230 |
| 42 | 代谢与营养异常 | `42-alterations-in-metabolism-and-nutrition` | 10,083 |
| **U12（5 章）** | | | |
| 43 | 神经系统结构与功能 | `43-structure-and-function-of-the-nervous-system` | 8,602 |
| 44 | 脑功能急性疾病 | `44-acute-disorders-of-brain-function` | 8,870 |
| 45 | 慢性神经功能障碍 | `45-chronic-disorders-of-neurologic-function` | 8,713 |
| 46 | 特殊感觉功能异常 | `46-alterations-in-special-sensory-function` | 9,089 |
| 47 | 疼痛 | `47-pain` | 8,943 |
| **U13（1 章）** | | | |
| 48 | 精神心理健康障碍 | `48-mental-health-disorders` | 13,150 |
| **U14（3 章）** | | | |
| 49 | 骨骼肌肉系统结构与功能 | `49-structure-and-function-of-the-musculoskeletal-system` | 10,281 |
| 50 | 骨骼肌肉功能异常：创伤、感染与疾病 | `50-alterations-in-musculoskeletal-function-trauma-infection-and-disease` | 11,310 |
| 51 | 骨骼肌肉功能异常：风湿性疾病 | `51-alterations-in-musculoskeletal-function-rheumatic-disorders` | 10,702 |
| **U15（2 章）** | | | |
| 52 | 皮肤系统异常 | `52-alterations-in-the-integumentary-system` | 10,721 |
| 53 | 烧伤 | `53-burn-injuries` | 10,640 |

合计：**53 章**，已建 **53 章**，正文 **491,953** 非空白字。
<!-- BSLJ53:END -->

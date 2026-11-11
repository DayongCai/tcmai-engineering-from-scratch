# 外科护理学

> 围手术期→流程编排 / 并发症→风险预测

| 项目 | 内容 |
|------|------|
| 院系 | 🩺 护理系 `05-huli` |
| 类型 | Clinic |
| 学期 | 第 5 学期（🌿 长·积累 / 大三） |
| 学时 | 72 |
| 章节目标 | 10 |
| 学科编号 | 068 / 135 |
| 英文名 | Surgical Nursing |

## 一、学科定位

外科护理学（Surgical Nursing）是护理系的核心学科，聚焦「中医护理特色技术 + 现代护理全科能力」中的一个完整知识域。

## 二、中医 → AI 桥梁

```text
围手术期→流程编排 / 并发症→风险预测
```

外科护理学 里的每一个传统概念，都被翻译成一个可计算、可验证的工程对象：
中医概念给出**语义与约束**，AI/工程方法给出**表示与算法**。两者必须能互相回指，
否则这个章节就还没有写完。

## 三、章节地图（目标 10 章）

章节尚未编写。运行脚手架开章：

```bash
node scripts/scaffold_chapter.js 05-huli/08-waike-huli-xue 01-<chapter-slug>
```

编写完成后，把章节索引写进 `chapters.json`，本表的「状态」列由
`scripts/build_catalog.js` 自动填充。

## 四、章节契约（每章必须满足）

```text
chapters/NN-<slug>/
├── docs/zh.md      # MOTTO / PROBLEM / 环境逼迫 / 知识积累 / CONCEPT / BUILD IT / USE IT / SHIP IT
├── code/           # 可运行、自终止、退出码 0（Node.js 或 Python，见 AGENTS.md 依赖白名单）
├── quiz.json       # 恰好 6 题 = 1 pre + 3 check + 2 post
└── outputs/        # 可复用产出物（prompt / skill / agent / mcp / 临床工具）
```

## 五、教材交付 [textbooks]

```text
输出: textbooks/05-huli/08-waike-huli-xue/
├── 00-前言.md
├── 01-第1章-<标题>.md   ...
└── figures/                # Mermaid / SVG，禁止 ASCII 框图
```

## 六、平台交付 [tcmP]

```text
输出: platform/courses/05-huli/08-waike-huli-xue/
├── course.yaml             # 课程元数据 + 章节 → 视频映射
├── slides/                 # 讲稿 HTML（由 docs/zh.md 派生）
├── narration/              # TTS 旁白文本 + 音频
└── video/                  # 成片 MP4（H.264 / 720p 以上）
```

## 七、进度

| 指标 | 当前 | 目标 |
|------|------|------|
| 章节 | 0 | 10 |
| 视频 | 0 | 10 |
| 教材字数 | 0 | ≈ 60000 |

> 状态字形：🌱 未开始 ⬚ · 🚧 进行中 · ✅ 完成

## 七、底本与章节（2026-11 建成）

**教材**：`F:/textbooks/qhzy-外科护理学.xlsx`（18 内容章 / 18 单元 / **308,069 汉字**）。

| 文件 | 内容 |
|---|---|
| `底本.json` | 章 → 节 → 小节 → 段 ＋ counts ＋ sha256 |
| `units.json` | 18 单元，带三辨（评估与准备／术中术后照护／并发症与安全）、四位面（术式类别）词频与数值计数 |
| `chapter-map.json` | 课程 **13 章** ← 教材 18 章；合章理由逐章写在 `why` 字段，**单元不复用** |
| `axes.json` | 三辨与三位面候选词表（本课的计算口径） |
| `doc-config.json` | 本课的写法口径：链条、对象压力、报告规则、缺口声明、逐章问题与引文兜底 |
| `axis-probe.json` | 四位面三候选比值 |

**章 ↔ 教材**

| 章 | slug | 标题 | 教材章 | 单元 | 汉字 |
|---:|---|---|---|---:|---:|
| 1 | `01-gaishu-moshi` | 外科护理概述与工作模式 | 1、2 | 2 | 34,808 |
| 2 | `02-weishoushu-jichu` | 围手术期护理基础 | 3 | 1 | 17,368 |
| 3 | `03-pinggu-jishu` | 外科护理评估、记录与常用技术 | 4、5 | 2 | 35,292 |
| 4 | `04-ganran-yeti` | 感染防控与液体治疗、管路护理 | 6、7 | 2 | 34,035 |
| 5 | `05-bingfazheng` | 围手术期并发症的预防与护理 | 8 | 1 | 16,711 |
| 6 | `06-puwai` | 普通外科疾病护理 | 9 | 1 | 17,517 |
| 7 | `07-shenwai` | 神经外科疾病护理 | 10 | 1 | 16,543 |
| 8 | `08-xiongwai` | 心胸外科疾病护理 | 11 | 1 | 17,218 |
| 9 | `09-miniao` | 泌尿外科疾病护理 | 12 | 1 | 16,914 |
| 10 | `10-guke` | 骨科疾病护理 | 13 | 1 | 16,635 |
| 11 | `11-xueguan-shaoshang` | 血管外科与烧伤整形护理 | 14 | 1 | 16,919 |
| 12 | `12-shoushushi-mazui` | 手术室护理与麻醉复苏期护理 | 15、16 | 2 | 34,499 |
| 13 | `13-zhiliang-pingtai` | 外科护理质量风险与平台 | 17、18 | 2 | 33,610 |

**口径**

1. **三辨＝评估与准备／术中术后照护／并发症与安全**，实测 **1502 / 2331 / 876**，比值 **2.7×**；
2. **四位面＝术式类别，取 术式类别（1.4×）**。四位面取术式类别（1.4×）——这是全库最平的一轴，说明教材对五类术式的篇幅几乎均等；围术期阶段（13.2×）与场所（26.7×）均弃：门诊仅 3 次、监护室 17 次，取它们会得到大量空格。
3. **本课在系里的词面签名**：`安全风险`（六类词中密度最高的那一类，见 `standards/huli-xitong-签名.json`）。

**章的取法**

课程 13 章不是把 18 章平均切，而是按「术前评估与准备 → 术中配合与安全 → 术后观察与并发症 → 出院与随访」这条链重排：相邻两章若共用同一套判据就合章，若判据不同就分章。合章处逐条写在 `chapter-map.json` 的 `why` 里。

**代价与边界**

- **只写到类别与要点**：手术步骤、入路与器械规格 不在正文，以现行规范与机构制度为准；
- **个案不入正文**：例子一律为说明性表述，不含可定位的机构、人名与时间地点；
- **不替代专业判断**：本课为教学材料，不构成诊疗或护理意见；发现异常按现行报告与转介流程及院内制度报告与转介。

**复算**

```bash
python scripts/build_huli_course.py waike-huli "F:/textbooks/qhzy-外科护理学.xlsx"      # 工作簿 → 底本 + 单元层
python scripts/scaffold_huli_chapter.py waike-huli departments/05-huli/08-waike-huli-xue --all  # 全章 code/main.js + 测试
python scripts/build_huli_docs.py waike-huli                          # 全章 docs / quiz / outputs
python scripts/crosscheck_huli5.py                               # 护理系九门课词面签名
```

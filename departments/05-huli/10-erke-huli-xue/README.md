# 儿科护理学

> 儿童生长发育→曲线拟合 / 用药剂量→体重规则

| 项目 | 内容 |
|------|------|
| 院系 | 🩺 护理系 `05-huli` |
| 类型 | Clinic |
| 学期 | 第 6 学期（🌿 长·积累 / 大三） |
| 学时 | 54 |
| 章节目标 | 8 |
| 学科编号 | 070 / 135 |
| 英文名 | Pediatric Nursing |

## 一、学科定位

儿科护理学（Pediatric Nursing）是护理系的核心学科，聚焦「中医护理特色技术 + 现代护理全科能力」中的一个完整知识域。

## 二、中医 → AI 桥梁

```text
儿童生长发育→曲线拟合 / 用药剂量→体重规则
```

儿科护理学 里的每一个传统概念，都被翻译成一个可计算、可验证的工程对象：
中医概念给出**语义与约束**，AI/工程方法给出**表示与算法**。两者必须能互相回指，
否则这个章节就还没有写完。

## 三、章节地图（目标 8 章）

章节尚未编写。运行脚手架开章：

```bash
node scripts/scaffold_chapter.js 05-huli/10-erke-huli-xue 01-<chapter-slug>
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
输出: textbooks/05-huli/10-erke-huli-xue/
├── 00-前言.md
├── 01-第1章-<标题>.md   ...
└── figures/                # Mermaid / SVG，禁止 ASCII 框图
```

## 六、平台交付 [tcmP]

```text
输出: platform/courses/05-huli/10-erke-huli-xue/
├── course.yaml             # 课程元数据 + 章节 → 视频映射
├── slides/                 # 讲稿 HTML（由 docs/zh.md 派生）
├── narration/              # TTS 旁白文本 + 音频
└── video/                  # 成片 MP4（H.264 / 720p 以上）
```

## 七、进度

| 指标 | 当前 | 目标 |
|------|------|------|
| 章节 | 0 | 8 |
| 视频 | 0 | 8 |
| 教材字数 | 0 | ≈ 48000 |

> 状态字形：🌱 未开始 ⬚ · 🚧 进行中 · ✅ 完成

## 七、底本与章节（2026-11 建成）

**教材**：`F:/textbooks/qhzy-儿科护理学.xlsx`（18 内容章 / 18 单元 / **336,946 汉字**）。

| 文件 | 内容 |
|---|---|
| `底本.json` | 章 → 节 → 小节 → 段 ＋ counts ＋ sha256 |
| `units.json` | 18 单元，带三辨（生长发育／疾病护理／安全与家属）、四位面（系统）词频与数值计数 |
| `chapter-map.json` | 课程 **15 章** ← 教材 18 章；合章理由逐章写在 `why` 字段，**单元不复用** |
| `axes.json` | 三辨与三位面候选词表（本课的计算口径） |
| `doc-config.json` | 本课的写法口径：链条、对象压力、报告规则、缺口声明、逐章问题与引文兜底 |
| `axis-probe.json` | 四位面三候选比值 |

**章 ↔ 教材**

| 章 | slug | 标题 | 教材章 | 单元 | 汉字 |
|---:|---|---|---|---:|---:|
| 1 | `01-gaishu-moshi` | 儿科护理概述与工作模式 | 1、2 | 2 | 38,182 |
| 2 | `02-pinggu-jiankang` | 儿科护理评估与健康指导 | 3 | 1 | 20,369 |
| 3 | `03-baojian-shengzhang` | 儿童保健与生长发育的护理 | 4 | 1 | 19,468 |
| 4 | `04-xinshenger` | 新生儿与早产儿的护理 | 5 | 1 | 18,760 |
| 5 | `05-yingyang` | 营养障碍性疾病的护理 | 6 | 1 | 19,117 |
| 6 | `06-huxi` | 呼吸系统疾病的护理 | 7 | 1 | 18,287 |
| 7 | `07-xiaohua` | 消化系统疾病的护理 | 8 | 1 | 18,387 |
| 8 | `08-xunhuan-xueye` | 循环与血液系统疾病的护理 | 9 | 1 | 18,259 |
| 9 | `09-miniao-shenjing` | 泌尿与神经系统疾病的护理 | 10 | 1 | 18,163 |
| 10 | `10-chuanran` | 儿童传染性疾病与感染防控的护理 | 11 | 1 | 18,159 |
| 11 | `11-jizheng` | 儿童急症与意外伤害的护理 | 12 | 1 | 18,364 |
| 12 | `12-waike` | 儿童外科疾病的护理 | 13 | 1 | 18,677 |
| 13 | `13-zhengzhuang-tengtong` | 儿童常见症状与疼痛的护理 | 14 | 1 | 18,455 |
| 14 | `14-teshu-manbing` | 特殊儿童与慢病儿童的护理 | 15 | 1 | 17,663 |
| 15 | `15-baohu-zhiliang` | 儿童保护、质量风险与平台 | 16、17、18 | 3 | 56,636 |

**口径**

1. **三辨＝生长发育／疾病护理／安全与家属**，实测 **656 / 5582 / 2156**，比值 **8.5×**；
2. **四位面＝系统，取 系统（6.9×）**。四位面取系统（5.5×）——与教材各论 09–10 章同构；年龄段（6.9×）弃：青春期仅 43 次，教材几乎不写青春期；场所（653×）弃：新生儿室只有 3 次。
3. **本课在系里的词面签名**：`家属沟通`（六类词中密度最高的那一类，见 `standards/huli-xitong-签名.json`）。

**章的取法**

课程 15 章不是把 18 章平均切，而是按「按年龄定基线 → 按系统看异常 → 按家庭做落实」这条链重排：相邻两章若共用同一套判据就合章，若判据不同就分章。合章处逐条写在 `chapter-map.json` 的 `why` 里。

**代价与边界**

- **只写到类别与要点**：具体剂量与生长发育数值 不在正文，以现行规范与机构制度为准；
- **个案不入正文**：例子一律为说明性表述，不含可定位的机构、人名与时间地点；
- **不替代专业判断**：本课为教学材料，不构成诊疗或护理意见；发现异常按现行报告与转介流程及院内制度报告与转介。

**复算**

```bash
python scripts/build_huli_course.py erke-huli "F:/textbooks/qhzy-儿科护理学.xlsx"      # 工作簿 → 底本 + 单元层
python scripts/scaffold_huli_chapter.py erke-huli departments/05-huli/10-erke-huli-xue --all  # 全章 code/main.js + 测试
python scripts/build_huli_docs.py erke-huli                          # 全章 docs / quiz / outputs
python scripts/crosscheck_huli5.py                               # 护理系九门课词面签名
```

# 康复护理学

> 功能评定→量表计算 / 康复计划→目标分解

| 项目 | 内容 |
|------|------|
| 院系 | 🩺 护理系 `05-huli` |
| 类型 | Clinic |
| 学期 | 第 6 学期（🌿 长·积累 / 大三） |
| 学时 | 36 |
| 章节目标 | 18 |
| 学科编号 | 087 / 150 |
| 英文名 | Rehabilitation Nursing |

## 一、学科定位

康复护理学（Rehabilitation Nursing）是护理系的核心学科，聚焦「中医护理特色技术 + 现代护理全科能力」中的一个完整知识域。

## 二、中医 → AI 桥梁

```text
功能评定→量表计算 / 康复计划→目标分解
```

康复护理学 里的每一个传统概念，都被翻译成一个可计算、可验证的工程对象：
中医概念给出**语义与约束**，AI/工程方法给出**表示与算法**。两者必须能互相回指，
否则这个章节就还没有写完。

## 三、章节地图（目标 18 章）

章节尚未编写。运行脚手架开章：

```bash
node scripts/scaffold_chapter.js 05-huli/22-kangfu-huli-xue 01-<chapter-slug>
```

编写完成后，把章节索引写进 `chapters.json`，本表的「状态」列由
`scripts/build_catalog.js` 自动填充。

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
输出: textbooks/05-huli/22-kangfu-huli-xue/
├── 00-前言.md
├── 01-第1章-<标题>.md   ...
└── figures/                # Mermaid / SVG，禁止 ASCII 框图
```

## 六、平台交付 [tcmP]

```text
输出: platform/courses/05-huli/22-kangfu-huli-xue/
├── course.yaml             # 课程元数据 + 章节 → 视频映射
├── slides/                 # 讲稿 HTML（由 docs/zh.md 派生）
├── narration/              # TTS 旁白文本 + 音频
└── video/                  # 成片 MP4（H.264 / 720p 以上）
```

## 七、进度

| 指标 | 当前 | 目标 |
|------|------|------|
| 章节 | 0 | 18 |
| 视频 | 0 | 18 |
| 教材字数 | 0 | ≈ 108000 |

> 状态字形：🌱 未开始 ⬚ · 🚧 进行中 · ✅ 完成

## 七、底本与章节（2026-11 建成）

**教材**：`F:/textbooks/qhzy-康复护理学.xlsx`（18 内容章 / 18 单元 / **305,891 汉字**）。

| 文件 | 内容 |
|---|---|
| `底本.json` | 章 → 节 → 小节 → 段 ＋ counts ＋ sha256 |
| `units.json` | 18 单元，带三辨（功能评估／康复训练／并发症预防）、四位面（功能域）词频与数值计数 |
| `chapter-map.json` | 课程 **18 章** ← 教材 18 章；合章理由逐章写在 `why` 字段，**单元不复用** |
| `axes.json` | 三辨与三位面候选词表（本课的计算口径） |
| `doc-config.json` | 本课的写法口径：链条、对象压力、报告规则、缺口声明、逐章问题与引文兜底 |
| `axis-probe.json` | 四位面三候选比值 |

**章 ↔ 教材**

| 章 | slug | 标题 | 教材章 | 单元 | 汉字 |
|---:|---|---|---|---:|---:|
| 1 | `01-gaishu` | 康复护理学概述 | 1 | 1 | 16,848 |
| 2 | `02-lilun` | 康复护理的理论基础 | 2 | 1 | 16,822 |
| 3 | `03-tuandui-moshi` | 康复护理团队与工作模式 | 3 | 1 | 16,641 |
| 4 | `04-pinggu-jichu` | 康复护理评估基础 | 4 | 1 | 17,142 |
| 5 | `05-lunli-goutong` | 康复护理伦理与沟通 | 5 | 1 | 16,788 |
| 6 | `06-jishu-anquan` | 康复护理基本技术与安全 | 6 | 1 | 16,669 |
| 7 | `07-yundong-gongneng` | 运动功能康复护理 | 7 | 1 | 17,503 |
| 8 | `08-adl` | 日常生活活动能力康复护理 | 8 | 1 | 17,227 |
| 9 | `09-yanyu-yantun-renzhi` | 言语、吞咽与认知康复护理 | 9 | 1 | 17,634 |
| 10 | `10-zhongyi-kangfu` | 中医康复护理技术 | 10 | 1 | 17,106 |
| 11 | `11-bingfazheng-yufang` | 康复护理中的并发症预防 | 11 | 1 | 16,465 |
| 12 | `12-shenjing-xitong` | 神经系统疾病康复护理 | 12 | 1 | 16,762 |
| 13 | `13-gu-guanjie` | 骨与关节疾病康复护理 | 13 | 1 | 17,727 |
| 14 | `14-xinfei-daixie` | 心肺与代谢疾病康复护理 | 14 | 1 | 17,118 |
| 15 | `15-teshu-renqun` | 特殊人群康复护理 | 15 | 1 | 17,008 |
| 16 | `16-shequ-jujia` | 社区与居家康复护理 | 16 | 1 | 17,342 |
| 17 | `17-zhiliang-fengxian` | 康复护理质量与风险管理 | 17 | 1 | 16,850 |
| 18 | `18-pingtai` | 康复护理学与教学平台 | 18 | 1 | 16,239 |

**口径**

1. **三辨＝功能评估／康复训练／并发症预防**，实测 **1719 / 1447 / 1459**，比值 **1.2×**；
2. **四位面＝功能域，取 功能域（2.3×）**。四位面取功能域（2.3×）。康复阶段（33.8×）弃：恢复期只有 6 次，教材不按阶段编排；病种（4.2×）弃：它与功能域是两套并行的分类，取病种会把课写成「按病讲康复」。
3. **本课在系里的词面签名**：`功能康复`（六类词中密度最高的那一类，见 `standards/huli-xitong-签名.json`）。

**章的取法**

课程 18 章不是把 18 章平均切，而是按「评定功能基线 → 定训练目标 → 训练与代偿 → 复评与调整」这条链重排：相邻两章若共用同一套判据就合章，若判据不同就分章。合章处逐条写在 `chapter-map.json` 的 `why` 里。

**代价与边界**

- **只写到类别与要点**：具体训练处方与器械参数 不在正文，以现行规范与机构制度为准；
- **个案不入正文**：例子一律为说明性表述，不含可定位的机构、人名与时间地点；
- **不替代专业判断**：本课为教学材料，不构成诊疗或护理意见；发现异常按现行报告与转介流程及院内制度报告与转介。

**复算**

```bash
python scripts/build_huli_course.py kangfu-huli "F:/textbooks/qhzy-康复护理学.xlsx"      # 工作簿 → 底本 + 单元层
python scripts/scaffold_huli_chapter.py kangfu-huli departments/05-huli/22-kangfu-huli-xue --all  # 全章 code/main.js + 测试
python scripts/build_huli_docs.py kangfu-huli                          # 全章 docs / quiz / outputs
python scripts/crosscheck_huli5.py                               # 护理系九门课词面签名
```

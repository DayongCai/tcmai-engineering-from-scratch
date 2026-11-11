# 推拿学

> 手法参数→力-时曲线 / 疗效评价→量表分析

| 项目 | 内容 |
|------|------|
| 院系 | 🪡 针灸系 `03-zhenjiu` |
| 类型 | Clinic |
| 学期 | 第 4 学期（🌱 生·启蒙 / 大一–大二） |
| 学时 | 72 |
| 章节目标 | 10 |
| 学科编号 | 035 / 135 |
| 英文名 | Tui Na (Chinese Massage) |

## 一、学科定位

推拿学（Tui Na (Chinese Massage)）是针灸系的核心学科，聚焦「经络腧穴—刺法灸法—针灸治疗 与推拿康复的完整链条」中的一个完整知识域。

## 二、中医 → AI 桥梁

```text
手法参数→力-时曲线 / 疗效评价→量表分析
```

推拿学 里的每一个传统概念，都被翻译成一个可计算、可验证的工程对象：
中医概念给出**语义与约束**，AI/工程方法给出**表示与算法**。两者必须能互相回指，
否则这个章节就还没有写完。

## 三、章节地图（目标 10 章）

章节尚未编写。运行脚手架开章：

```bash
node scripts/scaffold_chapter.js 03-zhenjiu/05-tuina-xue 01-<chapter-slug>
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
输出: textbooks/03-zhenjiu/05-tuina-xue/
├── 00-前言.md
├── 01-第1章-<标题>.md   ...
└── figures/                # Mermaid / SVG，禁止 ASCII 框图
```

## 六、平台交付 [tcmP]

```text
输出: platform/courses/03-zhenjiu/05-tuina-xue/
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

**教材**：`F:/textbooks/qhzy-推拿学.xlsx`（12 内容章 / 68 单元 / **201,634 汉字**），
sha256 与平台表清单见 `standards/tuina/METHOD.json`。

**底本层**（全部由脚本现算）

| 文件 | 内容 |
|---|---|
| `底本.json` | 章 → 节 → 小节 → 段（标题 + 正文）＋ counts ＋ sha256 |
| `units.json` | 68 单元，每单元带三辨（手法操作/作用机理/临床应用）、四位面（疏通经络/理筋整复/滑利关节/调整脏腑）词频与数值计数 |
| `chapter-map.json` | 课程 10 章 → 教材单元号（教材 12 章按病与法编排，课程按能力编排，两者不同构） |
| `axis-probe.json` | 四位面三候选：作用 **2.8×**（取）、部位 5.2×、手法 5.7× |

**章 ↔ 教材**

| 章 | slug | 标题 | 单元 | 汉字 |
|---:|---|---|---:|---:|
| 1 | `01-yuanliu-yuanli` | 推拿的源流与治疗原理 | 8 | 19,611 |
| 2 | `02-shiyingzheng-fengxian` | 推拿的适应证、禁忌与风险 | 6 | 18,889 |
| 3 | `03-chengren-buwei` | 成人推拿的常用部位与操作 | 9 | 22,610 |
| 4 | `04-xiaoer-tuina` | 小儿推拿的特定穴与手法 | 5 | 15,949 |
| 5 | `05-jizhu-tuina` | 脊柱推拿与手法安全性 | 6 | 14,509 |
| 6 | `06-jingjian-yaotui` | 推拿治疗颈肩腰腿痛 | 9 | 28,530 |
| 7 | `07-neike-fuke` | 推拿在内科与妇科的应用 | 4 | 21,135 |
| 8 | `08-lixue-celiang` | 推拿的力学测量与剂量 | 4 | 12,928 |
| 9 | `09-liaoxiao-pingjia` | 推拿疗效的评价与盲法难题 | 4 | 11,908 |
| 10 | `10-chufang-jilu` | 推拿处方的结构化记录 | 5 | 15,152 |

**未取的两章（有意）**：推拿功法（11,546 字）、推拿康复与养生保健（11,729 字）。
教材第 5 章「推拿功法」归 `18-tuina-gongfa-xue`，第 11 章「康复养生」归 `15-zhongyi-kangfu-xue`，本课程不重复吃进。

**口径**

1. **三辨＝手法操作／作用机理／临床应用**：取自教材每节的写法（着力面—频率—时间 → 机理 → 适应证与注意），不另造分类；
2. **四位面取「作用」**（2.8× 最小），理由：与教材 2.1「作用原理」同构，且分布最平（疏通 398／理筋 390／滑利 1074／调脏腑 625）；部位轴 5.2×、手法轴 5.7× 留痕不取；
3. **手法操作词压倒性**（全库 8872 次 vs 作用机理 1399）：这是教材的写法，不是权重结论——**文本在讲操作，不等于操作最重要**；
4. **数值只认可数单位**（次/分、分钟、度、公斤）；「力度适中」「以耐受为度」不计入，因此数值命中只有 264 处——**不是剂量写得少，是剂量写得不可数**。

**复算**

```bash
python scripts/build_tuina_text.py                 # 教材 → 底本 + 单元层
python scripts/scaffold_tuina_chapter.py 03-chengren-buwei
python scripts/_tuina_docs_out.py                  # 10 章 docs/quiz/outputs
cd chapters/03-chengren-buwei && node code/main.js
```

**边界**：底本给的是文字化的操作描述，不含手下的量感与个体差异；脊柱旋转扳法、小儿推拿风险较高，正文与技能均不给自行操作指引。内容为教学整理，**不构成诊疗建议**。

# 各家针灸学说

> 学派观点→文献聚类 / 手法差异→特征对比

| 项目 | 内容 |
|------|------|
| 院系 | 🪡 针灸系 `03-zhenjiu` |
| 类型 | Reference |
| 学期 | 第 6 学期（🌿 长·积累 / 大三） |
| 学时 | 36 |
| 章节目标 | 12 |
| 学科编号 | 047 / 150 |
| 英文名 | Schools of Acupuncture |

## 一、学科定位

各家针灸学说（Schools of Acupuncture）是针灸系的核心学科，聚焦「经络腧穴—刺法灸法—针灸治疗 与推拿康复的完整链条」中的一个完整知识域。

## 二、中医 → AI 桥梁

```text
学派观点→文献聚类 / 手法差异→特征对比
```

各家针灸学说 里的每一个传统概念，都被翻译成一个可计算、可验证的工程对象：
中医概念给出**语义与约束**，AI/工程方法给出**表示与算法**。两者必须能互相回指，
否则这个章节就还没有写完。

## 三、章节地图（目标 12 章）

章节尚未编写。运行脚手架开章：

```bash
node scripts/scaffold_chapter.js 03-zhenjiu/17-gejia-zhenjiu-xueshuo 01-<chapter-slug>
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
输出: textbooks/03-zhenjiu/17-gejia-zhenjiu-xueshuo/
├── 00-前言.md
├── 01-第1章-<标题>.md   ...
└── figures/                # Mermaid / SVG，禁止 ASCII 框图
```

## 六、平台交付 [tcmP]

```text
输出: platform/courses/03-zhenjiu/17-gejia-zhenjiu-xueshuo/
├── course.yaml             # 课程元数据 + 章节 → 视频映射
├── slides/                 # 讲稿 HTML（由 docs/zh.md 派生）
├── narration/              # TTS 旁白文本 + 音频
└── video/                  # 成片 MP4（H.264 / 720p 以上）
```

## 七、进度

| 指标 | 当前 | 目标 |
|------|------|------|
| 章节 | 0 | 12 |
| 视频 | 0 | 12 |
| 教材字数 | 0 | ≈ 72000 |

> 状态字形：🌱 未开始 ⬚ · 🚧 进行中 · ✅ 完成

## 七、底本与章节（2026-11 建成）

**教材**：`F:/textbooks/qhzy-各家针灸学说.xlsx`（12 内容章 / 138 单元 / **140,111 汉字**），
sha256 与平台表清单见 `standards/zhenjiu-gejia/METHOD.json`。

**底本层**（全部由脚本现算）

| 文件 | 内容 |
|---|---|
| `底本.json` | 章 → 节 → 小节 → 段（标题 + 正文）＋ counts ＋ sha256 |
| `units.json` | 138 单元，每单元带三辨（学说主张/文献依据/临证应用）、四位面（先秦两汉/晋唐/宋金元/明清近代）词频与数值计数 |
| `METHOD.json` | 平台表清单 ＋ 三套四位面候选的实测比值 |
| `axis-probe.json` | 探底原值：时代 **4.8×**、载体 10.7×、主题 4.2× |

**章 ↔ 教材（章号一一对应，无需 chapter-map）**

| 章 | slug | 标题 | 单元 | 汉字 | 三辨主 |
|---:|---|---|---:|---:|---|
| 1 | `01-gaishu-yanbian` | 各家针灸学说概述 | 4 | 7,699 | 学说主张 |
| 2 | `02-liupai-xingcheng` | 针灸学术流派的形成与分类 | 4 | 7,856 | 临证应用 |
| 3 | `03-neijing-sixiang` | 《内经》针灸学术思想 | 6 | 11,951 | 文献依据 |
| 4 | `04-nanjing-shanghan` | 《难经》与《伤寒杂病论》针灸学术思想 | 6 | 10,736 | 临证应用 |
| 5 | `05-jintang-yijia` | 晋唐针灸医家学术思想 | 12 | 12,732 | 临证应用 |
| 6 | `06-songjinyuan-yijia` | 宋金元针灸医家学术思想 | 20 | 12,960 | 临证应用 |
| 7 | `07-mingdai-yijia` | 明代针灸医家学术思想 | 28 | 18,971 | 临证应用 |
| 8 | `08-qingdai-yijia` | 清代针灸医家学术思想 | 12 | 12,087 | 临证应用 |
| 9 | `09-jindai-yijia` | 近代针灸医家学术思想 | 8 | 11,267 | 临证应用 |
| 10 | `10-dangdai-liupai` | 当代针灸学术流派 | 24 | 13,797 | 临证应用 |
| 11 | `11-linchuang-chuancheng` | 针灸各家学说的临床应用与传承 | 8 | 11,063 | 临证应用 |
| 12 | `12-shuzihua-ai` | 各家针灸学说与数字化AI时代 | 6 | 8,992 | 文献依据 |

合计 12 章 · 138 单元 · 140,111 汉字 · 数值类命中 94。

**口径**

1. **三辨＝学说主张／文献依据／临证应用**：取自教材每节的固定写法（人物 → 主张 → 依据 → 应用），不另造分类；
2. **四位面＝先秦两汉／晋唐／宋金元／明清近代**：三套候选实测时代 4.8×、载体 10.7×、主题 4.2×。
   取**时代**而非比值更小的主题，理由：主题轴被「灸」这一词根污染（灸法/艾灸/温针灸重复计入，3649 次），
   非真实主题分布；且教材 03–10 章本就按时代编排，时代轴与结构同构。**取轴的理由留痕，不取「数字最小」当唯一标准**；
3. **横切章的时代重心天然偏后**（概述／分类／传承／数字化四章都落在「明清近代」）：
   这不是错误，是横切章与断代章在同一指标下的必然错位，正文逐章写明。

**复算**

```bash
python scripts/build_zjgejia_text.py                       # 教材 → 底本 + 单元层
python scripts/scaffold_zjgejia_chapter.py 01-gaishu-yanbian # 单章 code/
python scripts/_zjgejia_docs_out.py                        # 12 章 docs/quiz/outputs
cd chapters/01-gaishu-yanbian && node code/main.js
```

**边界**：底本只给「教材写了谁、写了什么」；某家当年被谁反对、后来被谁改动，教材不进正文结构，本章复算不出来。
人名频次≠学术地位，引书次数≠学说被验证。内容为教学整理，不构成诊疗建议；针刺与艾灸须由受训人员在有资质机构实施。

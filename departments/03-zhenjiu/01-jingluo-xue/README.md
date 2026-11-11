# 经络学

> 经络循行→图结构 / 路径查询→图遍历

| 项目 | 内容 |
|------|------|
| 院系 | 🪡 针灸系 `03-zhenjiu` |
| 类型 | Core |
| 学期 | 第 2 学期（🌱 生·启蒙 / 大一–大二） |
| 学时 | 72 |
| 章节目标 | 10 |
| 学科编号 | 031 / 135 |
| 英文名 | Meridian Theory |

## 一、学科定位

经络学（Meridian Theory）是针灸系的核心学科，聚焦「经络腧穴—刺法灸法—针灸治疗 与推拿康复的完整链条」中的一个完整知识域。

## 二、中医 → AI 桥梁

```text
经络循行→图结构 / 路径查询→图遍历
```

经络学 里的每一个传统概念，都被翻译成一个可计算、可验证的工程对象：
中医概念给出**语义与约束**，AI/工程方法给出**表示与算法**。两者必须能互相回指，
否则这个章节就还没有写完。

## 三、章节地图（目标 10 章）

章节尚未编写。运行脚手架开章：

```bash
node scripts/scaffold_chapter.js 03-zhenjiu/01-jingluo-xue 01-<chapter-slug>
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
输出: textbooks/03-zhenjiu/01-jingluo-xue/
├── 00-前言.md
├── 01-第1章-<标题>.md   ...
└── figures/                # Mermaid / SVG，禁止 ASCII 框图
```

## 六、平台交付 [tcmP]

```text
输出: platform/courses/03-zhenjiu/01-jingluo-xue/
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

**教材**：`F:/textbooks/qhzy-经络腧穴学.xlsx`（20 内容章 / 104 单元 / 214,124 汉字），
sha256 与平台表清单见 `standards/jingluo/METHOD.json`。

**底本层**（全部由脚本现算，不手打）：

| 文件 | 内容 |
|---|---|
| `standards/jingluo/底本.json` | 章 → 节 → 小节 → 段（标题 + 正文）＋ counts ＋ sha256 |
| `standards/jingluo/units.json` | 104 个单元，每单元带三辨（循行/定位/主治）、四位面（手三阴/手三阳/足三阳/足三阴）词频与数值计数 |
| `standards/jingluo/METHOD.json` | 平台表清单、三套四位面候选的实测比值 |
| `standards/jingluo/axis-probe.json` | 词频探底原值（经脉分区 2.0× / 特定穴 2.9× / 篇章职能 8.5×，取最小者） |
| `standards/jingluo/chapter-map.json` | 课程 10 章 → 教材单元号的映射（教材按「一经一章」20 章，课程按知识结构 10 章，两者不同构） |

**章 ↔ 教材映射与规模**

| 章 | slug | 标题 | 教材章 | 单元 | 汉字 |
|---:|---|---|---|---:|---:|
| 1 | `01-zucheng-mingming` | 经络系统的组成与命名 | 教材第 1 章 | 3 | 5,633 |
| 2 | `02-shier-jingmai` | 十二经脉的走向与交接 | 教材第 1、4、5、6、7、8、9、10、11、12、13、14、15 章 | 13 | 23,265 |
| 3 | `03-qijing-bamai` | 奇经八脉的循行与功能 | 教材第 16 章 | 7 | 13,691 |
| 4 | `04-jingbie-jinjing` | 经别、经筋与皮部 | 教材第 18 章 | 4 | 11,972 |
| 5 | `05-biaoli-peishu` | 经络与脏腑的表里配属 | 教材第 1、4、5、6、7、8、9、10、11、12、13、14、15 章 | 13 | 20,718 |
| 6 | `06-bingli-fanying` | 经络的病理反应与诊断意义 | 教材第 4、5、6、7、8、9、10、11、12、13、14、15、19 章 | 13 | 18,047 |
| 7 | `07-jingluo-kongjian` | 经络图的空间结构与坐标 | 教材第 2 章 | 6 | 7,150 |
| 8 | `08-liuzhu-shijian` | 经脉流注次序与时间节律 | 教材第 1、16 章 | 4 | 5,340 |
| 9 | `09-jiepou-zhengyi` | 经络的现代解剖学对应争议 | 教材第 19 章 | 4 | 7,164 |
| 10 | `10-tupu-jianku` | 经络数据的图谱化建库 | 教材第 17、19、20 章 | 6 | 16,788 |

合计 10 章 · 73 次单元取用 · 129,768 汉字（含跨章复用）；教材去重 214,124 字——**未被课程 10 章取用的 84,356 字集中在十二经的「重点穴」与附篇歌赋**，是有意的取舍：课程 10 章走知识结构，不逐穴铺开。

**口径**

1. **三辨＝循行／定位／主治**，取自教材每经章固定的小节序（循行 → 病候 → 主治 → 重点穴），不另造分类；
2. **四位面＝手三阴／手三阳／足三阳／足三阴**，与教材 04–15 章一一对应；三套候选实测比值 2.0×／2.9×／8.5×，取最小者，其余留进 `axis-probe.json`；
3. **四位面在腧穴概论与现代研究两章全为 0**：教材这部分横向论题，不按经脉分区写——此章测试断言改为「四位面不适用」，**不伪造数据**。

**复算**

```bash
python scripts/build_jingluo_text.py                        # 教材 → 底本 + 单元层
python scripts/scaffold_jingluo_chapter.py 01-zucheng-mingming   # 单章 code/
python scripts/_jl_docs_out.py                              # 10 章 docs/quiz/outputs
cd chapters/01-zucheng-mingming && node code/main.js
```

**边界**：底本给的是「教材写了什么」；定位手感、个体差异与流派差异不在文本里。词频不等于重要性（词早词晚、词疏词密反映构词与时代）。本章内容为教学整理，不构成诊疗建议，针刺与艾灸须由受训人员在有资质机构实施。

# 中医内科学

> 脏腑辨证→决策树 / 证型→集成分类

| 项目 | 内容 |
|------|------|
| 院系 | ☯️ 中医系 `01-zhongyi` |
| 类型 | Clinic |
| 学期 | 第 5 学期（🌿 长·积累 / 大三） |
| 学时 | 108 |
| 章节目标 | 14 |
| 学科编号 | 010 / 135 |
| 英文名 | TCM Internal Medicine |

## 一、学科定位

中医内科学（TCM Internal Medicine）是中医系的核心学科，聚焦「理法方药的内核：基础理论、经典、临床各科」中的一个完整知识域。

## 二、中医 → AI 桥梁

```text
脏腑辨证→决策树 / 证型→集成分类
```

中医内科学 里的每一个传统概念，都被翻译成一个可计算、可验证的工程对象：
中医概念给出**语义与约束**，AI/工程方法给出**表示与算法**。两者必须能互相回指，
否则这个章节就还没有写完。

## 三、章节地图（14 章全部已写）

底本：`E:/textbooks/qhzy-中医内科学.xlsx`（12 章 / 83 节 / 384 小节 / 384 条目 · 329,826 汉字 · 41 处量值），
抽取为 `standards/neike/底本.json`；编写约定见 `standards/neike/README.md`。

**章目为什么不是原来的病证式切分**：旧 14 章把底本一章拆两章、又把两章并一章（咳嗽与喘证 / 肺痈肺痿 …），
引文章号会来回跳，门没法核。现在前 12 章与底本 1:1，第 13、14 章保留本仓的 AI 桥梁章（跨章引）。

| 项 | 值 |
|---|--:|
| 已写章节 | **14 / 14** |
| docs 非空白字 | **158,013**（8,022 – 16,577） |
| 教材引文 | 逐字回查，按 locator 指定的节/小节范围核 |
| 小节覆盖 | 底本 12 章的 **384 个小节号全部落位** |
| 门 | `node tests/test_neike_chapters.js` **9/9** |

下表由 `python scripts/render_neike_table.py` 生成（数字现算，`--check` 可核漂移）。

### 平台侧骨架（platform/）

`platform/courses/01-zhongyi/10-zhongyi-neike-xue/course.yaml` —— 14 章登记表，**全部 `video: planned`**。
与病理生理学 / 药理学同一口径：只登记「讲什么、什么状态」，不写 `estimate_minutes` / `measured_minutes`
（没有 lesson.json 就写等于编数）；状态按磁盘逐级判定，往上层走只要重跑脚本。

```bash
npm run neike:yaml          # 渲染 course.yaml
npm run neike:yaml:check    # 漂移检查（已接入 npm run check）
```

### 旁白层（narration/）

14 章 `narration/lesson.json`（**只出文本与分段，不做音频**）：175 段 / 估算 **287 分钟**。
`narration-map.json` 声明 `sequential: true` + `drop`（课程信息 / 逐条落位 / 运行与验证 / 免责），
角色只按整段标题词匹配——用泛化的「边界」会把正文小节「范围与边界」误判成边界段，已踩过并修正。

### 配音 / 字幕 / 成片（rendered）

| 项 | 值 |
|---|--:|
| audio | **175 段 · 278 分 5 秒实测**（≈4.63 小时；估算 287 分，偏差 −3.1%） |
| 字幕 | 175 条 cue · 视音差全部实测 0 |
| 成片 | **14 / 14 章 · 4.63 小时 · 0.42 GB**（1920×1080 / 25fps / mov_text 字幕轨） |

门第 10 项核旁白：段数 ≥8、六角色齐、spoken 非空、段和 = 总时长、`course.yaml` 状态不低于 narration-ready。
门第 11 项核成片：14 章时长与实测配音差 ≤2s、带字幕轨、总时长 >4 小时。

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
输出: textbooks/01-zhongyi/10-zhongyi-neike-xue/
├── 00-前言.md
├── 01-第1章-<标题>.md   ...
└── figures/                # Mermaid / SVG，禁止 ASCII 框图
```

## 六、平台交付 [tcmP]

```text
输出: platform/courses/01-zhongyi/10-zhongyi-neike-xue/
├── course.yaml             # 课程元数据 + 章节 → 视频映射
├── slides/                 # 讲稿 HTML（由 docs/zh.md 派生）
├── narration/              # TTS 旁白文本 + 音频
└── video/                  # 成片 MP4（H.264 / 720p 以上）
```

## 七、进度

| 指标 | 当前 | 目标 |
|------|------|------|
| 章节 | 0 | 14 |
| 视频 | 0 | 14 |
| 教材字数 | 0 | ≈ 84000 |

> 状态字形：🌱 未开始 ⬚ · 🚧 进行中 · ✅ 完成

<!-- NEIKE14:BEGIN -->
| 章 | 标题 | slug | 底本节/小节 | 非空白字 | 状态 |
|--:|---|---|---|--:|---|
| **总论** | | | | | |
| 1 | 绪论 | `01-xulun` | 3 节 / 6 小节 | 8587 | ✅ |
| 2 | 中医内科疾病的辨证论治思路与方法 | `02-bianzheng-silu` | 5 节 / 17 小节 | 11214 | ✅ |
| 3 | 脏腑辨证纲要与内科治则 | `03-zangfu-bianzheng-gangyao` | 8 节 / 25 小节 | 10313 | ✅ |
| **病证各论** | | | | | |
| 4 | 肺系病证 | `04-feixi-bingzheng` | 8 节 / 40 小节 | 11787 | ✅ |
| 5 | 心系病证 | `05-xinxi-bingzheng` | 9 节 / 45 小节 | 15911 | ✅ |
| 6 | 脾胃系病证 | `06-piwei-bingzheng` | 9 节 / 45 小节 | 15247 | ✅ |
| 7 | 肝系病证 | `07-ganxi-bingzheng` | 9 节 / 48 小节 | 16577 | ✅ |
| 8 | 肾系病证 | `08-shenxi-bingzheng` | 6 节 / 30 小节 | 12998 | ✅ |
| 9 | 气血津液病证 | `09-qixue-jinye-bingzheng` | 9 节 / 55 小节 | 8224 | ✅ |
| 10 | 肢体经络病证 | `10-zhiti-jingluo-bingzheng` | 5 节 / 25 小节 | 8066 | ✅ |
| 11 | 常见急症与传染病 | `11-jizheng-chuanranbing` | 8 节 / 40 小节 | 8019 | ✅ |
| **拓展** | | | | | |
| 12 | 中医内科学的数字化与AI时代 | `12-shuzihua-ai` | 4 节 / 8 小节 | 8060 | ✅ |
| **综合** | | | | | |
| 13 | 证候—方剂—疗效的因果推断 | `13-zhengfang-liaoxiao` | 综合章 | 12063 | ✅ |
| 14 | 内科分型与 ICD-11 的映射 | `14-fenxing-icd11` | 综合章 | 10947 | ✅ |

已写 **14 / 14** 章，正文合计 **158013** 非空白字。
<!-- NEIKE14:END -->

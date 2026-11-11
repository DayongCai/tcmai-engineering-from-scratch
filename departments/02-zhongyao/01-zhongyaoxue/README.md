# 中药学

> 四气五味归经→词嵌入 / 功效相似度→余弦距离

| 项目 | 内容 |
|------|------|
| 院系 | 🌾 中药系 `02-zhongyao` |
| 类型 | Core |
| 学期 | 第 2 学期（🌱 生·启蒙 / 大一–大二） |
| 学时 | 90 |
| 章节目标 | 14 |
| 学科编号 | 016 / 135 |
| 英文名 | Chinese Materia Medica |

## 一、学科定位

中药学（Chinese Materia Medica）是中药系的核心学科，聚焦「本草、方剂与中药全产业链：资源—鉴定—化学—药理—制剂」中的一个完整知识域。

## 二、中医 → AI 桥梁

```text
四气五味归经→词嵌入 / 功效相似度→余弦距离
```

中药学 里的每一个传统概念，都被翻译成一个可计算、可验证的工程对象：
中医概念给出**语义与约束**，AI/工程方法给出**表示与算法**。两者必须能互相回指，
否则这个章节就还没有写完。

## 三、章节地图（目标 14 章）

章节尚未编写。运行脚手架开章：

```bash
node scripts/scaffold_chapter.js 02-zhongyao/01-zhongyaoxue 01-<chapter-slug>
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
输出: textbooks/02-zhongyao/01-zhongyaoxue/
├── 00-前言.md
├── 01-第1章-<标题>.md   ...
└── figures/                # Mermaid / SVG，禁止 ASCII 框图
```

## 六、平台交付 [tcmP]

```text
输出: platform/courses/02-zhongyao/01-zhongyaoxue/
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

## 八、底本与药物库（2026-11 补建）

《中药学》14 章早于本仓当前口径建成（docs 只有概念与代码，没有**逐味药的可核表**）。本轮补两层，正文不动结论、只挂证据：

**底本层**（`standards/zhongyao-xue/`，与 `standards/zhongyao/` 并存不覆盖）

| 文件 | 内容 |
|---|---|
| `底本.json` | 30 章 → 节 → 小节 → 段 ＋ counts ＋ sha256 |
| `units.json` | 340 单元（一小节一条），带三辨/四气词频与数值计数 |
| `药物库.json` | **340 条**：药名 / 性味归经 / 归经 / 功效 / 用法用量 / 使用注意 / locator |
| `axis-probe.json` | 四位面三候选实测：**肺系/脾胃/心肝/肾与膀胱 1.6×（取）**；四气 12.6×、功效大类 2.7× 留痕 |

**14 章各增一节「本章药物表与实测」**（`docs/zh.md` 内，数据现算）

| 章 | slug | 教材章 | 小节 | 汉字 | 药 |
|---:|---|---|---:|---:|---:|
| 1 | `01-xingneng-siqi` | 1–5 | 34 | 5,716 | 34 |
| 2 | `02-jiebiaoyao-fengh` | 9 | 21 | 3,006 | 21 |
| 3 | `03-qingreyao-fenlei` | 10 | 36 | 4,628 | 36 |
| 4 | `04-xiexia-qushi` | 11–14 | 45 | 5,774 | 45 |
| 5 | `05-wenli-liqi` | 15、16 | 19 | 2,522 | 19 |
| 6 | `06-xiaoshi-zhixue` | 17–19 | 24 | 2,956 | 24 |
| 7 | `07-huoxue-huayu` | 20 | 23 | 3,121 | 23 |
| 8 | `08-huatan-kesou` | 21 | 25 | 3,251 | 25 |
| 9 | `09-anshen-pinggan` | 22–24 | 26 | 3,669 | 26 |
| 10 | `10-buxuyao-fenlei` | 25 | 39 | 5,750 | 39 |
| 11 | `11-shouse-yongtu` | 26、27 | 17 | 2,217 | 17 |
| 12 | `12-xingneng-bianma` | 5–8 | 23 | 3,911 | 23 |
| 13 | `13-caiyao-zhijian` | 3、4、6 | 17 | 2,769 | 17 |
| 14 | `14-gongdu-badu` | 28、29 | 12 | 1,683 | 12 |

**三辨实测（全书）**：性能 1462 · 功效 925 · 应用 1547（比值 1.7×）。
教材把「应用」写得最多——**中药学的重心不在背性能，在记住这味药能治什么、和谁配、什么不能用**。

**两处如实记的缺口**

1. **性味归经解析率 226/340**（66%），归经 259/340：教材部分条目只写功效、不写性味（如朱砂、龙骨、雷公藤），**不补写，标缺口**；
2. **底本是「种子内容版」**（`qhzy-中药学.xlsx`，sha256 `6934bcebc856a70f…`，47,844 汉字 / 30 章，约 1,600 字一章）：它给的是每味药的骨架字段，不含成方与临床案例。所以本课的价值在**药物层的可核表**，不与新近建成的《中药化学》（47,844 字级底本）比厚度。

**复算**

```bash
python scripts/build_zhongyao_xue_text.py         # 工作簿 → 底本 + 单元 + 药物库
python scripts/report_zhongyao_stats.py            # 14 章一览
python scripts/report_zhongyao_stats.py 09-anshen-pinggan
```

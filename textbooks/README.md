# [textbooks] 120 门学科教材

这是与 **[tcmP]** 并列的第二类交付物。

| | [tcmP] 视频平台 | [textbooks] 教材 |
|---|---|---|
| 载体 | 站点 + 视频 | Markdown → PDF / EPUB |
| 讲什么 | **怎么做** —— 一步步跑通 | **为什么这样做** —— 概念、出处、边界 |
| 读者 | 边看边敲 | 系统阅读与查证 |
| 长度 | 每章 ≈10 分钟 | 每章 ≈6000 字 |
| 同源 | ✅ 都从 `chapters/<slug>/docs/zh.md` 派生的事实出发 | |

**同源不同体。** 教材不是课程文档的复制，重心从「代码怎么跑」转到「这个翻译为什么成立、
哪里不成立、历代医家怎么讲」。但两者引用的事实（配属表、经典出处、关系方向）
必须完全一致 —— 一旦不一致，就是有一处写错了。

---

## 目录结构

```text
textbooks/
├── README.md              本文件
├── volumes.json           五卷定义（生 / 长 / 壮 / 老 / 已）
├── build_book.js          汇总 → build/<volume>.md，PDF/EPUB 需 pandoc
└── <dept>/<subject>/
    ├── 00-前言.md
    ├── 01-第1章-<标题>.md
    ├── 02-第2章-<标题>.md
    ├── figures/           Mermaid / SVG（禁止 ASCII 框图）
    └── build/             生成物：分卷 markdown、PDF、EPUB
```

---

## 五卷

| 卷 | 阶段 | 学期 | 主题 |
|---|---|---|---|
| 一 | 🌱 生 · 启蒙 | 1–4 | 把中医的语法讲成可计算的对象 |
| 二 | 🌿 长 · 积累 | 5–6 | 经典、临床各科与表示的建立 |
| 三 | 🌳 壮 · 鼎盛 | 7–8 | 从表示走到系统 |
| 四 | 🍂 老 · 固化 | 9 | 临床轮转中的系统检验 |
| 五 | 🔄 已 · 转型 | 10 | 毕业设计与知识移交 |

分卷定义见 [volumes.json](volumes.json)。

---

## 教材章契约

每章 `NN-第N章-<标题>.md` 必须包含：

```markdown
# 第 N 章 · <标题>

> **本章要回答的问题:** <一句话>

## N.1 概念与出处
   逐条给出经典原文或标准出处，写清「书名·篇名」或标准号

## N.2 为什么可以这样翻译
   把中医命题 → 形式化表示的推理过程写出来，而不是只给结论

## N.3 这个翻译丢掉了什么
   必须写。没有一节「丢失了什么」的教材，是在骗人

## N.4 与相邻学科的接口
   本章的概念在哪些其他学科被用到，以什么形式被用到

## N.5 争议与本项目立场
   学界有分歧的地方，给出各方观点，并说明本项目采用哪一说、为什么

## 本章小结
## 思考题
## 延伸阅读
```

### 硬规则

1. **每章必须有「这个翻译丢掉了什么」一节。** 这是本项目教材与一般教材最大的区别。
2. **出处写到篇名/标准号级别。** 「详见某教材」不算出处。
3. **图只用 Mermaid 或 SVG。**
4. **引文必须可核查。** 引用经典原文时，原文必须逐字准确；不确定就不引。
5. **与章节文档的事实必须一致。** 配属表、关系方向、数值结论，两处必须能对上。
6. **临床内容必须带免责声明。**

---

### 改写块（`<!-- REWRITE:BEGIN/END -->`）—— 脚本重渲染不许覆盖人工内容

有的教材目录是**脚本渲染 + 人工改写**两层（例如病理生理学：源正文由讲义切章生成，N.1–N.5 人工写）。
脚本一跑就会整篇重写，人工写的那几节会被冲掉。约定：

```markdown
<!-- REWRITE:BEGIN -->
## 本章要回答的问题
## N.1 概念与出处
## N.2 为什么可以这样翻译
## N.3 这个翻译丢掉了什么
## N.4 与相邻学科的接口
## N.5 争议与本项目立场
## 思考题
## 延伸阅读
<!-- REWRITE:END -->
```

- 渲染脚本**只认这两个标记之间的内容**，整块原样搬回文末；标记外一律重渲染。
- 改写块必须落在文末（它是「在正文之上加的判断」，不是插在正文中间）。
- **免责句位置固定：`N.5` 之后、`思考题` 之前。** 不是文末——文末是「延伸阅读」，免责句放在
  那之后会被当脚注读；放在 N.5 后面，读者读完立场就知道边界在哪。2026-10-31 定为一条，
  门按位置核（此前 51 章在这个位置、2 章放到文末，两种都「块内含免责句」，但读起来不一样）。
- 门 `tests/test_binglishengli_textbook.js` 核：块内八节齐、篇幅 ≥1,800 汉字、免责句在
  「N.5 之后、思考题之前」、引到的节号真实存在、不出现页码类不可核出处、图型与行数合法。
- 该门目前只覆盖病理生理学一门。**第二门同级门**：`tests/test_jichu_textbook.js`（中医基础理论 13 章）——
  同一套检查，另加两条：改写块内用反引号引的源节号必须**在本章正文标题里真实存在**、每章 N.1 至少一处《书名·篇名》级出处。
  两门都已接入 `npm run check`。
- 写法与粒度以 `textbooks/09-jichu/11-bingli-shengli-xue/` 的第 1、2、19、20、48 章为样板。

## 操作型章契约（`handbook-v1`）—— 轮转与毕设用

第 9/10 学期的 18 门课（临床轮转 / 专业实践 / 工程实践 / 科研实训 + 毕业设计）**不是讲授型课程**：
学生要的是当天能执行的流程、能打印的清单、能带教签字的模板，而不是 6000 字论证。
把这套内容写成论文体，等于把手册写成散文；反过来把学术章放水成清单，等于毁掉上面的硬规则。
所以本仓库有**两套章契约并存**，按课程性质选用，**判定不靠猜**：

| 契约 | 用于 | 章结构 | 验收 |
|---|---|---|---|
| 学术型（默认） | 讲授型学科（1–8 学期） | N.1 概念与出处 → N.5 争议与立场 | `textbooks/README.md` 本页 + 人工审读 |
| **操作型 `handbook-v1`** | 轮转 / 实践 / 毕设（9–10 学期） | **H.1 问题 → H.2 目标 → H.3 流程 → H.4 清单 → H.5 模板 → H.6 失效 → H.7 考核** | `node scripts/check_handbook_contract.js` |

判定字段：`departments/<dept>/<subject>/meta.json` 的 `textbook.contract`（`handbook-v1` 或省略）。
操作型章的硬要求：七节齐全 · 流程步骤 ≥4 · 清单 ≥6（`- [ ]`）· 失效 ≥3 · 考核 ≥3 · 模板 ≥4 个字段 ·
正文 ≥400 汉字 · 必须带免责/边界声明 · 章首必须声明 `handbook-v1`。

### 生成与校核

```bash
node scripts/build_handbook_textbooks.js          # 从 data/handbook/*.json 渲染 18 门手册
node scripts/build_handbook_textbooks.js --check   # 重渲染比对 + 篇幅下限
node scripts/check_handbook_contract.js            # 契约审计（结构/篇幅/声明/契约字段一致性）
```

内容在 `data/handbook/<dept>__<slug>.json`（作者维护），**脚本只渲染不生成内容** —— 改内容改数据，不改脚本。

### 源正文层 vs 改写层（当前进度的口径）

教材目录里的稿子分**四层**，**必须分清，否则「有字」会被当成「按契约写完」**：

| 层 | 内容 | 谁写的 | 现状（2026-11-15 实测） |
|---|---|---|---|
| **源正文层（底本）** | 章 / 节 / 小节 / 细目 + 正文段落 | 桌面 100 份学科种子稿（`qhzy-*.xlsx`）逐行抽取 | 已落地 **109 门 / 1,769 章**（源表章表合计 1,621 —— 源表口径与磁盘实章是两列，看板分列不抹平；其中 **58 章**是本库撰写层补章/开稿章，见下） |
| **源正文层（外源）** | 公有领域古籍正文，按篇/门切章 | `scripts/fetch_external_textbooks.js` 抓取 + `scripts/import_external_textbooks.js` 切分 | 已落地 **7 门 / 755 章**（五官 5 + 骨伤 2）；**不并入底本统计**，见 [EXTERNAL-SOURCES.md](../standards/materials/textbooks-batch/EXTERNAL-SOURCES.md) |
| **操作型层（手册）** | H.1–H.7 流程/清单/模板/考核 | `data/handbook/*.json` 作者撰写 + `scripts/build_handbook_textbooks.js` 渲染 | 已落地 **18 门 / 130 章**（9 院系 × 轮转 + 毕设），契约 `handbook-v1` |
| **改写层** | 章首「本章要回答的问题」、N.2–N.5（尤其 N.3「丢掉了什么」） | 人（或人审过的写作） | **3 门 / 90 章**（金匮要略 24、病理生理学 53、中医基础理论 13）= 全书 **3.5%**；其余 2,506 章仍只有源正文层（90 改写层 + 58 撰写层） |

四层**分账**：底本 109 门 / 1,769 章；外源 7 门 / 755 章；手册 18 门 / 130 章；合计 **137 门 / 2,682 章**，覆盖 189 门学科里的 137 门（**52 门未开稿**：派生/合成课没有独立教材，见下）。
任何把外源或手册并进底本的数字都是口径错误。外源引用须标「外源·笈成·&lt;书名&gt; 第N条」，不得标「底本」。

### 补章登记：教学计划的章，教材没有时怎么办

底本章数少于教学计划时，有两种完全相反的情况，**不许混成一句「缺 N 章」**：

| 情况 | 判据 | 处理 |
|---|---|---|
| 真的缺内容 | 教学计划要的章，底本里根本没有这块知识 | 按「本库撰写层」补写，**章首明写无底本表**，逐章登记依据（`standards/<x>/补章登记.json`） |
| 切分口径不同 | 教学按条文流程细分、教材按学科章组织 | **不补**，改为登记逐条映射（probe 关键词必须能在所指教材章里 grep 到） |

现存九份登记（`node tests/test_textbook_supplement.js` 核，已接入 `npm run check`；含 4 份补章 + 3 门开稿 + 药事口径登记）：

| 课 | 教学章 | 教材章 | 结论 |
|---|--:|--:|---|
| 伤寒论 | 12 | 12 | 补 **2 章**（第 11 条文的检索与可复现 / 第 12 经方剂量的三把尺）—— 底本只有原文十卷，这两块是真缺 |
| 中医内科学 | 14 | 14 | 补 **2 章**（第 13 证候—方剂—疗效的因果边界 / 第 14 内科分型与 ICD-11 映射）—— 底本 12 章无此内容 |
| 药事管理学 | 28 | 20 | **不补章 · 已决口径**（`standards/口径决案.json`，2026-11-15）：28 教学章 100% 有教材章承接（probe 28/28 命中），差的是切分轴 —— 教材按**学科体系** 20 章，教学按**法规流程** 28 章。拆教材会破坏底本逐章对应、并课程要删 8 个章目录并重写 13 章契约，两条路都已否决并写明理由。法规**操作层**内容另立 [`附录A-法规操作专题`](02-zhongyao/18-yaoshi-guanli-xue/附录A-法规操作专题.md)：不当章、不计章数，106 条外源条文逐字可查 |
| 口腔修复学 | 10 | **10** | **开稿已满**（`mode: "开稿"`）：本课没有底本表，10 章按 8 份 T/CHSA 团标重写（23,050 汉字 · 37,023 非空白字）。全部章过 `tests/test_source_topics.js` 的引用门（引用可核 + 摘句逐字）与 `tests/test_textbook_supplement.js` 的八节契约 |
| 口腔正畸学 | 10 | **10** | **开稿已满**（`mode: "开稿"`）：无底本表，10 章按 4 份 T/CHSA 团标/共识重写（19,644 汉字 · 30,882 非空白字，章目与教学计划逐条同名同序）。同一套两道门 |
| 护理研究与循证护理 | 8 | **8** | **开稿已满**（`mode: "开稿"`）：无底本表，8 章按 18 份外源（PRISMA/WHO/ROBIS/GRADE/Cochrane 4 章/3 份 JBI 核查表/COSMIN/伦理审查办法 2023/JBI 手册镜像）撰写，91 条条文逐字可核；**15,961 汉字 · 92 处引用**，章目与教学计划逐条同名同序 |
| 中药新药研发 | 8 | **8** | **开稿已满**（`mode: "开稿"`）：无底本表，8 章按 4 份 WHO 指南（GMP / GACP / 质量与污染物 / 安全性监测，17 条）撰写，注册与药物警戒条文**跨库借用** `standards/yaoshi-guanli`（106 条，Z 类用〔文本锚点〕引用）；**15,578 汉字 · 40 处引用**，章目与教学计划逐条同名同序 |
| 中药毒理学 | 10 | **10** | **开稿已满**（`mode: "开稿"`）：无底本表，46 条外源分两层——**方法与要求层** 27 条（12 份 OECD 测试指南 + 4 份国内指导原则）+ **机制与实例层** 19 条（何首乌肝损伤、雷公藤甲素肝毒性、马兜铃酸肾病、乌头碱中毒分析、十八反十九畏方剂网络研究，均为开放获取文献的文本快照）。**19,094 汉字 · 75 处引用**；章目与教学计划逐条同名同序。两层证据等级不同，已在 `N.1` 分列来源，不混称「条文」 |
| 健康评估 | 8 | **8** | **开稿已满**（`mode: "开稿"`）：无底本表。外源 6 份 25 条（GDS-15 / Mini-Cog / Hendrich II / CDC 家庭安全清单 18 条 + WHO Decade of Healthy Ageing 2019 内在能力与功能发挥框架 4 条 + 内在能力结构综述 3 条）。**「四域适应框架」是本项目对 WHO 框架的本土化改编**，不是 WHO 原文——每章 N.1 分列「外部依据」与「本项目框架」；社会域与环境域无国际量表，用结构化问诊与 CDC 清单。**14,877 汉字 · 30 处引用** |


### 教材线接了多少课：134 门接了，55 门有正文但没接

看板的「缺口清单」以前只写「未入库」，容易被读成「没写」。实际口径分三层（`data/textbook-board.json` 的 `gapBodyStats`，`--check` 逐项重算）：

| 判定 | 门数 | 章 | 去空白字 | 含义 |
|---|--:|--:|--:|---|
| 教材线已接 | 137 | 2,682 | 3,637 万字符 | `textbooks/` 有章文件，进五卷、进看板章数 |
| 有正文、未接出版线 | 52 | 454 | 449.6 万字符 | 教学章 `docs/zh.md` 已有正文，缺的是底本逐章对应 / 改写层 / 出版装配 |
| 源表无正文 | 0 | — | — | 只有大纲表，得先补底本 |

所以「52 门未开稿」不等于 52 门空着：**454 章、449.6 万字的正文已经在教学章里**，缺的是把它们按教材契约（章首块、出处、字数、引用）重排一遍、接进 `textbooks/` 与五卷。要开新的一门，走的是 `references/textbook-chapter-supplement.md` 那套工序，不是从零写。

### 源正文层 + 判断层：给已出版的章补 N.1–N.5（REWRITE 块工序）

有一批课**已经有正文**（`import_textbooks.js` 从底本工作簿逐字抽出，章文件里写着「请勿手改」），
缺的只是判断层。这类课不能走 `promote_course_to_textbook.py`（整章重写等于毁掉可核的源正文），
走的是「REWRITE 块」：

```bash
python scripts/apply_rewrite_block.py --slug zhongyao-huaxue           # 注入/更新章末判断层
python scripts/apply_rewrite_block.py --all --check                    # 全部重算比对
node tests/test_rewrite_blocks.js                                      # 门
```

判断层文本写在 `standards/<slug>/rewrite-plan.json`（每章 `n / n2 / n3 / n4 / n5 / check`）。
脚本只做三件事：**不动正文一个字**、把块替换成最新、把块落在文末（README 约定：判断层是「在正文之上加的判断」）。

门 `tests/test_rewrite_blocks.js` 核七件事：章文件存在且章号一致 · 块在文末 · 八节齐 · 免责句在 N.5 与思考题之间 ·
N.2/N.5 各 ≥200 汉字 · 与脚本重算一致 · **块前正文仍以 `import_textbooks` 的两行尾注结尾**（证明正文没被偷改）。

已接入三门：中药化学 12 章（206,959 汉字）、方剂学 24 章（387,691 汉字），判断层合计 36 段 N.2/N.5。

### 存量转出版件：把教学章 `docs/zh.md` 重排成教材章

看板上「有正文、未接出版线」的课（当前 **52 门 / 454 章 / 449.6 万字**）不缺内容，缺的是按教材契约重排一遍。这条工序把机械部分自动化，判断部分留给人：

```bash
python scripts/promote_course_to_textbook.py --slug 13-linchuang-keyan-fangfa          # 生成教材章
python scripts/promote_course_to_textbook.py --slug 13-linchuang-keyan-fangfa --check   # 幂等校验
node tests/test_promoted_textbook.js                                                    # 六项门
```

三门输入，分工写死：

| 文件 | 谁写 | 写什么 |
|---|---|---|
| `standards/<slug>/promote.json` | 人 | 章分组（`src` = 这一章覆盖底本哪几本的第几章）、章名、本章要回答的问题 |
| `standards/<slug>/promote-hand.json` | 人 | 每章的 N.2「为什么可以这样翻译」、N.5「争议与本项目立场」、思考题 |
| `standards/<slug>/units.json` | 生成物 | 单元层：`locator`（`教材·第N章·X.Y`）、`source`（书名:第N章·节）、`body`（底本正文） |

脚本只做机械部分：章首块、N.1 逐单元出处表、逐单元读正文、N.3（由教学章「代价与边界」节转换）、N.4（由相邻课接口拼）、免责句定位、思考题、延伸阅读、附录B 对照表。**N.2 / N.5 缺一段就报错退出，不给占位符。**

门 `tests/test_promoted_textbook.js` 核六件事：底本覆盖不重不漏（`src` = 单元实际来源集合）· 章数 1:1 且章名与文件首行一致 · N.1 表行数 = 单元数 · 免责句在 N.5 与思考题之间 · N.2/N.5 各 ≥200 汉字 · 与生成器重算一致。

**样板课**：`13-linchuang-keyan-fangfa`（临床科研方法学），8 章 / 231 单元 / 331,606 汉字，底本为合成底本（《卫生统计学》18 章 + 《卫生信息管理》3 章）。该课暴露的三类问题记在 `standards/13-linchuang-keyan-fangfa/promote.json` 的 `knownIssues` 里：教学章名与底本内容错位、`doc-config.json` 的书名与路径前缀错、`gapNote` 与底本实测不符。**章名按内容重起、出处按 units 现算**，不沿用错的。

### 口径决案：教材章 < 教学章，但不是欠账

有些课的教材章数**永远不会**等于教学计划章数，因为两者是**两条不同的切分轴**。这类差必须留「决案」，不能只写在 README 里，也不能靠在看板上挂个例外了事：

| 机制 | 说明 |
|---|---|
| 决案文件 | `standards/口径决案.json`：`subject` / `teachingChapters` / `textbookChapters` / `decision` / **`rejectedOptions`（每条附否决理由）** / `evidence` / `reviewIf` |
| 看板 | 决案内的课从 `chapters-short`（异常）移到 `chapters-short-decided`（已决口径），两个数字仍原样显示；决案里记的章数与实测不符则回退成异常并标 `decision-stale` |
| 门 | `tests/test_textbook_supplement.js` 第 6 项：字段齐（含否决理由）· 与 `补章登记.json` 的 `noSupplement` 对齐 · 看板必须是 `chapters-short-decided` 且不得同时是异常或过期 |

现存决案 1 份（药事管理学 20/28）。**全库 `chapters-short` 异常已清零**。

补章的硬要求（门逐条核）：章首块写「本库撰写层」且**不许冒充源正文层** · 八节齐 · ≥1,800 汉字 · 免责句在 N.5 之后思考题之前 · 每条依据的 `path` 真实存在 · 篇名级依据须为《书名·篇名》形态 · 无页码类不可核出处。

开稿章多一道门：章内每个「外源·<团标名> 第N条」都要在 `外源条文.json` 里查到且 `verified`，摘句归一后必须逐字命中原文（`node tests/test_source_topics.js`，16 项）。

**这四个数不许手抄**，改完内容按下面两条重算，两个脚本必须报同一个章数：

```bash
node textbooks/build_book.js --check              # 按卷汇总：2,682 章 / 137 门
node scripts/build_textbook_board.js --check      # 逐学科扫盘：合计 2,682 章
```

`build_book.js --check` 会把**按卷汇总**与**看板扫盘**对撞；不等即退出码 1（2026-11-15 就是靠它查出本脚本吞掉 286 章三位数章号：外源古籍学科章数过百，`100-第100章` 之后全被 `^\d{2}-` 过滤掉）。同理，图对账（引用缺图 / 孤儿图）与事实一致性出现 ❌ 也一律退出码 1 —— 只打印红字不改退出码，等于没有门。

**61 门未开稿不是欠账，是口径** —— 逐门归因（2026-11-15 实测，脚本见下）：

| 归因 | 门数 | 为什么不建独立教材稿 |
|---|--:|---|
| 合成课（`source.kind = synthesized`） | 24 | 正文就是母课章节的再切，另建一份 = 同一文字两个出处 |
| 派生课（`kind/from` 或来源串含「派生」） | 14 | 同上：正文复用母课语料，教材稿应写「按母本合成的改写层」 |
| 无独立底本（无 `standards/<x>` 目录） | 18 | 34 门新增课里的手写/实践类，**先补母本**才谈教材 |
| 复用母本（工作簿已归另一门课） | 4 | 卫生法学→卫生法学课、卫生统计学→医学统计学、卫生信息管理→医学信息管理、中医智能仪器→中医智能设备；母本已切过一次，走引用不切第二份 |
| 外源课（`sources/` + `外源条文.json`，正文本库撰写） | 1 | 护理研究循证：无教材可抽，教材稿属改写层，不是源正文层 |

逐门明细：

```bash
node textbooks/build_book.js --check | tail -20   # 未开稿学科（学期 / 卷次）
python scripts/audit_textbook_gaps.py             # 三层缺口清单（底本 / 单元层 / 正文层）
```

源正文层（底本/外源）的每一章首块都写着来源表名 / 书名、sha256 前 16 位与该章字数，可复算：

```bash
node scripts/import_textbooks.js --check           # 底本逐章对账：文件 ↔ 源工作簿
node scripts/import_external_textbooks.js --check  # 外源逐章对账：文件 ↔ 留档
node scripts/build_handbook_textbooks.js --check    # 手册：重渲染比对 + 篇幅下限
node scripts/check_handbook_contract.js             # 手册契约审计
```

所以 `build_book.js --check` 报的字数只说明**源正文已入库**，不说明改写层完成。
抽取账本（100 份的 sha256 / 章表清单 / 逐章字数 / 缺口）见
[`standards/materials/textbooks-batch/README.md`](../standards/materials/textbooks-batch/README.md)。

---

## 构建

```bash
# 汇总某卷为单个 Markdown（无需外部工具）
node textbooks/build_book.js --volume 1

# 全部卷
node textbooks/build_book.js --all

# 校核：教材与章节文档的事实一致性
node textbooks/build_book.js --check
```

PDF / EPUB 需要 `pandoc`（PDF 另需 xelatex）：

```bash
node textbooks/build_book.js --all --epub          # 五卷 EPUB（封面 / 目录 / 卷首说明）
node textbooks/build_book.js --all --pdf           # 五卷 PDF（xelatex · CJK 字体 SimSun）
node textbooks/build_book.js --publish-check      # 出版件校核：zip 结构 / 目录 / 章数 / 封面
python scripts/publish_books_github.py --dry-run  # 发布计划（Release 附件）
npm run textbooks:publish                         # 真正发布：DayongCai/tcm-course-books · books-v1
node scripts/check_release_assets.js --check      # 发布事实核验：附件 ↔ 本地产物（体积 / sha256 / 可取回）
```

### 发布状态（2026-11-21 实测，不靠记忆）

| 对象 | 状态 | 证据 |
|---|---|---|
| 《中医证候学》单书 EPUB + PDF | **已发布** | Release `zhenghou-2026-11-21`（主仓）：2 个资产、`draft=false`、published 2026-11-21T01:39:50Z；资产 `digest` 与本地 sha256 逐字节一致（epub `6b003b39…`、pdf `f3d2b58c…`），Range 请求 206 可取回 |
| 五卷 `books-v1`（EPUB 5 + PDF 5 + 清单） | **已发布**（2026-11-21，筋伤学/骨伤手法重写后重发） | Release `books-v1`（主仓）：11 个附件 / **125.8 MB** / **2,588 章** / PDF **19,294 页**；11/11 资产 `digest` 与本地 sha256 一致、Range 206 可取回（`node scripts/check_release_assets.js --tag books-v1 --check` exit 0） |

发布目标已从 `DayongCai/tcm-course-books`（匿名 404）改为**主仓**：附件匿名可下，省掉私有仓这道坎。
令牌来源是 git credential helper（`git credential fill`，`gho_…`，scopes `repo`），**不落仓库、不落日志**。

口径：**「已发布」= 三项同时成立**——资产在且非草稿、sha256 与 GitHub 记录的 `digest` 一致、能 Range 取回。
只写一句「已发」或只看到 `download_count` 都不算；`scripts/check_release_assets.js --check` 就是干这个的（只读，不上传）。
注意 GitHub 会把非 ASCII 资产名压成 `default`，所以资产用 ASCII 名，中文书名放在 release 标题与正文里。

**缺工具时明确报错，不生成占位文件。** 2026-11-18 本机实测：pandoc 3.5（`%LOCALAPPDATA%\pandoc`）、
xelatex MiKTeX 25.12（`%LOCALAPPDATA%\Programs\MiKTeX\miktex\bin\x64`），两者都由
`platform/pipeline/find_tools.js` 自己探测，不必进 PATH。

PDF 有两个必踩的坑，已在脚本里固定：

| 坑 | 现象 | 处理 |
|---|---|---|
| 章内 `---` + `键: 值` | pandoc 当 YAML 元数据块 → `YAML parse exception`，整卷不出 | `-yaml_metadata_block` + `--metadata-file` |
| 正文里的 Windows 路径 `D:\ICD11-source` | pandoc 读成行内 **raw TeX**（`\ICD11` 是未定义控制序列）→ `Undefined control sequence` | `-raw_tex`：反斜杠回到普通文字，LaTeX writer 输出 `\textbackslash` |

`-raw_tex` 对 EPUB 同样必要：不关掉时那类行内 TeX 在 EPUB 里会被**整段丢弃**（路径静默消失）。

### 站内展示：`site/books.html`

成品不只躺在 `textbooks/build/`：站点新增「教材」页（导航第 7 项），逐卷列出 EPUB / PDF / 单文件 HTML
的**实测体积**与下载链接。

页尾还有 **Release 次入口**（`从 GitHub Release 下载（免构建）`）：读 `textbooks/build/books-release.json`，
逐件列出 `books-v1` 的附件、体积、sha256 前 12 位与直链，并给出核验命令——
给「没跑过构建」的读者一条不需要 pandoc/xelatex 就能拿到书的路。
没有发布记录时，这一节改为提示 `npm run textbooks:publish`，不会渲染空表。

```bash
node scripts/build_books_data.js   # series.json + 逐个核盘上文件 → site/books-data.js
npm run site                       # 重建页面（已把上一步串进 build / rebuild:all / site）
```

- 数据分两层：`series.json` 说「清单里有什么」，`site/books-data.js` 再记「盘上真有什么」（`ok` / `bytes`）——
  删掉产物后页面会显示「未构建」，而不是给一个点开 404 的链接。
- 干净克隆上没有 `textbooks/build/`，页面会明确显示「尚未构建」与重建命令，不假装可用。
- 下载链接是 `../textbooks/build/…`：本地 `npm run serve` 直接可下；部署时把该目录一并同步即可。
- `site/serve.js` 已补 `.epub → application/epub+zip`、`.pdf → application/pdf`
  （原先只会给 `application/octet-stream`，移动端/阅读器不会接管）。

### EPUB：每卷一本真电子书

| 项 | 做法 | 为什么 |
|---|---|---|
| 结构 | 卷首说明 → 院系部页 → 学科页 → 前置/章/附录 | 与网页版「系 → 课 → 章」同构；pandoc 按 `--split-level=1` 每 h1 拆一份 XHTML |
| 封面 | `textbooks/cover.js` 用系统 Edge 无头截图（800×1200 @2x） | 封面上的「N 章 / M 字」取的是**本次实测**，加章后封面不可能静默过期；零新增依赖 |
| 元数据 | `title / subtitle / author / lang=zh-CN / rights` 写进 `*.meta.yaml` | 书名页与 OPF 同源，不各写一份 |
| 图 | 章内 `figures/x.svg` 在聚合时改写成 `textbooks/<dept>/<subject>/figures/...` | 聚合后只有一个 md，原相对路径已不成立；pandoc 用 `--resource-path` 仓库根解析 |
| 样式 | `textbooks/epub.css` | 只定字体栈 / 行高 / 标题断页 / 表格边框——能跨阅读器生效的只有这几项 |
| 清单 | `textbooks/build/series.json`（逐卷章数 / 字数 / 四件产物） | 「出了几卷、成品在哪」不靠人记；不写时间戳，避免每日自报漂移 |

`--publish-check` 不是「文件存在即通过」：它读 EPUB 的 zip 中央目录，核
`mimetype` / `META-INF/container.xml` / `content.opf` / XHTML 文档数 ≥ 教材章数 / 封面图在包里。
存在但打不开的 EPUB 是最常见的假成品，这一道就是拦它的。

### 五卷产物（2026-11-18 实测，`textbooks/build/` 全量重建，五种形态）

| 卷 | 章 | 字 | Markdown | 单文件 HTML | EPUB | PDF | PDF 页数 |
|---|--:|--:|--:|--:|--:|--:|--:|
| 一 生 · 启蒙（1–4 学期） | 798 | 13,370,445 | 36.9 MB | 42.9 MB | 14.7 MB | 30.6 MB | 7,178 |
| 二 长 · 积累（5–6） | 785 | 11,705,204 | 32.8 MB | 34.1 MB | 12.6 MB | 26.9 MB | 5,658 |
| 三 壮 · 鼎盛（7–8） | 875 | 11,315,314 | 31.2 MB | 34.8 MB | 12.5 MB | 26.5 MB | 6,198 |
| 四 老 · 固化（9） | 54 | 101,841 | 0.29 MB | 0.37 MB | 0.3 MB | 0.6 MB | 110 |
| 五 已 · 转型（10） | 76 | 134,519 | 0.38 MB | 0.48 MB | 0.4 MB | 0.7 MB | 150 |
| **合计** | **2,588** | **36,627,323** | | | **40.5 MB** | **85.3 MB** | **19,294** |

产物落在 `textbooks/build/`，**不入库**（`.gitignore`）—— Markdown/HTML 一次 `--all` 约 10 秒；EPUB 约 2 分钟；**PDF 是小时级**
（卷一单本 7,178 页，xelatex 排一版约 1 小时）——入库的应是源稿，成品走 Release 附件。

PDF 的实测口径（不靠肉眼）：`pdfinfo` 取页数；`pdftotext -enc UTF-8` 抽回正文后与源 md 对字符计数
（卷一 ①/②/③/α = 1,225/1,184/938/1,071，与源 1,232/1,190/944/1,071 相比 α 完全一致、①②③ 差 6–7 处，落在跨页表格处，属抽取口径差异）。

**书里不只章**：每卷按「前置（`00-前言.md`）→ 各章 → 附录（`附录A…`）」排，共 127 份学科前言（12.0 万字）+ 19 份附录（约 4.2 万字）随书进卷，
目录项合计约 2,836（2,690 章 + 146 前置/附录）。**章数与字数只统计章**——否则与教材看板的扫盘口径打架；
证候学的 12 张图正是因为附录/凡例此前不进卷，成品里一张都看不到（2026-11-15 修）。

---

## 进度追踪

### 院系内教学进度与教材看板（生成物）

```bash
node scripts/build_textbook_board.js          # 重新生成下面三份
node scripts/build_textbook_board.js --check   # 重算比对，漂移即退出码 1（已接入 npm run check）
```

| 产物 | 内容 |
|---|---|
| [SCHEDULE.md](SCHEDULE.md) | 9 院系内部教学进度：学期 → 课程顺序 → 周学时（学时 ÷ 18）→ 周次 → 章推进 → 教材章实况 |
| [../textbook-board.html](../textbook-board.html) | 教材看板：9 院系分布、每项指标的「口径 + 现实锚点 + 复核命令」、缺口清单 |
| `../data/textbook-board.json` | 上面两份的数据源（逐学科对账矩阵 + 排课结果） |

口径：**周学时 = 学时 ÷ 18**（18 教学周 = 16 讲授 + 1 复习 + 1 考核），学时 ≤ 45 的课另给「前九周」方案；
院系内顺序 = 学期 ↑ → 类型 Core→Build→Clinic→Reference → 章节目标 ↓ → slug。学期归属不改 `curriculum.json`。

教材进度记在每门学科的 `meta.json` 里：

```json
"textbook": {
  "id": "textbooks",
  "path": "textbooks/01-zhongyi/01-zhongyi-jichu-lilun",
  "chaptersWritten": 1,
  "words": 6200,
  "status": "wip"
}
```

`scripts/build_roadmap.js` 会把这两个数字读进 `ROADMAP.md` 与站点进度页。
**填数字时必须实测**（用 `build_book.js --check` 输出的字数），不许估。

## 网络视频 ↔ 教学章 ↔ 教材章（三线挂接）

视频台账（`data/video-lessons.json`）与教材台账各自齐全，但学生看完一讲不知道读哪一章。
`data/video-textbook-links.json` 把三边对上：每讲 → 教学章号 → 教材章文件。

```bash
node scripts/build_video_textbook_links.js            # 生成挂接表
node scripts/build_video_textbook_links.js --check     # 重算比对，漂移即退 1（已接入 npm run check）
node tests/test_video_textbook_links.js                # 6 项门：课程集合 / 讲数可重算 / 教材章存在 / 关键词可复核 / status 自洽 / 合计
```

| 课 | 讲 | 教学章 | 教材章 | 已挂 | 状态 |
|---|--:|--:|--:|--:|---|
| 中医基础理论 | 10 | 10 | 13 | 10 | linked（教学→教材走 10 行口径映射） |
| 金匮要略 | 24 | 24 | 24 | 24 | linked |
| 中医内科学 | 14 | 14 | 14 | 14 | linked |
| 病理生理学 | 53 | 53 | 53 | 53 | linked |
| 药理学 | 49 | 49 | 49 | 49 | linked |
| 内经选读 | 196 | 10 | 31 | 13 | 部分（教材按主题分 31 章，讲按篇名分 162 篇） |
| 伤寒论 | 53 | 12 | 12 | 17 | 部分（陈瑞春讲按治法/方名，教材按六经篇章） |
| 医学人工智能导论 | 29 | 8 | 0 | 0 | no-textbook（该课无教材稿） |

**合计 8 门 / 428 讲 / 已挂 180 讲。**

两条硬规矩写进脚本与门，不靠自觉：

1. **讲数 > 章数时不平摊**。196 讲除以 10 章等于 19.6，硬除会把「上古天真论」挂到「藏象」上。脚本只认两种落点：序号 1:1，或讲标题里的篇名/方名在教材章正文里**真的出现**（`linkedBy: "keyword"`，门再读一遍正文复核）。剩下的记 `needs-segmentation`，等字幕段落或人工分段。
2. **纯编号标题（`第 3 讲` / `wy07` / `p12`）不许挂**。门里有一条专测：这类讲次一旦按关键词挂上就报错。

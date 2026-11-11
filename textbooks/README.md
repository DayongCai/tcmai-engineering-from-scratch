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

| 层 | 内容 | 谁写的 | 现状 |
|---|---|---|---|
| **源正文层（底本）** | 章 / 节 / 小节 / 细目 + 正文段落 | 桌面 100 份学科种子稿（`qhzy-*.xlsx`）逐行抽取 | 已落地 99 门学科 / 1,622 章（2026-10：09-jichu +12、03/05 +15、哲学史/机器学习 +2、选修 17；经络腧穴学按节题拆两门，中医基础理论合并手写改写章） |
| **源正文层（外源）** | 公有领域古籍正文，按篇/门切章 | `scripts/fetch_external_textbooks.js` 抓取 + `scripts/import_external_textbooks.js` 切分 | 已落地 **7 门 / 755 章**（五官 5 + 骨伤 2）；**不并入底本统计**，见 [EXTERNAL-SOURCES.md](../standards/materials/textbooks-batch/EXTERNAL-SOURCES.md) |
| **操作型层（手册）** | H.1–H.7 流程/清单/模板/考核 | `data/handbook/*.json` 作者撰写 + `scripts/build_handbook_textbooks.js` 渲染 | 已落地 **18 门 / 108 章**（9 院系 × 轮转 + 毕设），契约 `handbook-v1` |
| **改写层** | 章首「本章要回答的问题」、N.2–N.5（尤其 N.3「丢掉了什么」） | 人（或人审过的写作） | ⬚ 未撰写 |

四层**分账**：底本 100 门 / 1,622 章；外源 7 门 / 755 章；手册 18 门 / 108 章；合计 125 门 / 2,485 章。
任何把外源或手册并进底本的数字都是口径错误。外源引用须标「外源·笈成·&lt;书名&gt; 第N条」，不得标「底本」。

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

PDF / EPUB 需要 `pandoc`：

```bash
node textbooks/build_book.js --volume 1 --pdf
```

**缺 pandoc 时会明确报错，不生成占位 PDF。** 当前本机状态：pandoc 缺失（见
`node platform/pipeline/check_tools.js` 的探测结果），因此 **Markdown 汇总可用，PDF 不可用**。

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

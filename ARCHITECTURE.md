<!-- 本文件由 scripts/build_architecture.js 从 architecture.json 渲染，请勿手改。 -->

# 逻辑架构：参考 ai-engineering-from-scratch → 本仓库

保留参考项目的「**单向派生 + 横切门禁 + 契约继承**」三条逻辑，只换域词与层数。

**三份文档，各管一件事**（同一条事实只写一处）：

| 文档 | 管什么 |
|---|---|
| `FORKING.md` | 规程 —— 照着参考造一门新课，怎么做 |
| `PORTING.md` | 账本 —— 参考的哪一块对应本仓库的哪一块，逐个列 |
| `ARCHITECTURE.md` | 逻辑 —— 这套架构靠哪几条逻辑立住，以及换域时哪一层动、哪一层不动 |

## 一、这套架构靠四条逻辑立住

参考项目与换域后的本仓库共用这四条 —— **换域换的是词，不是逻辑**。

### L1 · 单向派生

**主张**：依赖只能朝一个方向：**事实源 → 投影 → 交付物**。反向引用一律视为 bug。

**为什么**：反向引用会让「重跑一次构建」变成不可预测的事 —— 派生件一旦被当成输入，下次重跑就换了一份数据。

**谁守着它**：`scripts/build_embeddings.js` · `tests/test_embeddings.js`

**证据**：嵌入层的语料**显式排除派生件**，并有断言钉住「语料里不许出现派生件（防自己的输出喂回自己的输入）」。这条不是设计洁癖：反馈环在本仓库真实开过三扇门（embeddings/index.json、endpoints/README.md、descriptions/），每次都是新写的 md 被当语料导致检索排名翻转。

### L2 · 事实源是文件，不是字段

**主张**：**目录树与原件是事实**，json 只是它的投影。改目录树即改事实，不需要人同步第二处。

**为什么**：「单一事实来源」若落在某个字段上，就一定会出现两个地方要同时改、且没人知道少改了哪一处的情况。

**谁守着它**：`scripts/build_catalog.js` · `scripts/check_readme_counts.js`

**证据**：curriculum.json 由扫 departments/ 得到；README 里的声明数字由 check_readme_counts 与 catalog 逐项对齐（可 --fix）。文档里的数字不许静默过期 —— 这条门在本次会话里抓出过 5 次数值过期（174→175→176→177→179）。

### L3 · 门是横切的，且每层各一道

**主张**：质量门不挂在某一层上，而是**对每一层各设一道**：L0 数据 / L1 结构 / L2 契约 / L3 内容。

**为什么**：只查存在性的门，空壳能通过 —— 等于没有门。

**谁守着它**：`scripts/audit_curriculum.js` · `tests/test_audit_l3.js`

**证据**：参考的审计是三层。逐条比完上游规则清单后发现：上游对 docs 的**内容**要求（引文《书名·篇名》/ 免责声明 / 代价与边界 / 最小篇幅）**当时无人查** —— 于是非加 L3 不可。L3 的负例里专门有一条「把『代价与边界』写在围栏代码块里」，防止拿示例输出冒充正文。

### L4 · 契约继承（换域只换词）

**主张**：章节的**形状**（code/ docs/ outputs/ quiz.json）是参考留下的接口。门、脚手架、站点渲染都只认这个形状，换域不改工具链。

**为什么**：工具链与内容解耦，才能出现「120 个学科全是空壳时审计先全绿」这个关键里程碑 —— 先把骨架和门立住，再填内容。

**谁守着它**：`scripts/scaffold_chapter.js` · `scripts/audit_curriculum.js`

**证据**：参考 lesson 的 code/docs/outputs/quiz.json 四点，本仓库照搬（docs 收紧为 docs/zh.md）。同一条逻辑也让 PORTING.md 里「拆分/合并」那些改动都发生在工具层，而非契约层。

## 二、分层与各层的门

```
  L0 事实源（不可再生）          横切门禁（对每层各一道）
  ┌──────────────────────┐       ┌────────────────────────┐
  │ departments/         │       │ L0 数据  npm run audit  │
  │ standards/**/sources │◄──────┤ L1 结构                 │
  │ data/icd11/          │  只读  │ L2 契约                 │
  └──────────┬───────────┘       │ L3 内容                 │
             │ 派生（单向）        │ 计数 / 链接 / 不漂移     │
             ▼                    └────────────────────────┘
  L1 投影 / 索引（可重跑）                  ▲
  ┌──────────────────────┐                 │ 每层各查一次
  │ curriculum.json      │                 │
  │ catalog.json         │─────────────────┘
  └──────────┬───────────┘
             │ 渲染（单向）
             ▼
  L2 内容（人写）    L3 交付物（两类）
  ┌──────────────┐   ┌──────────────────────┐
  │ docs/zh.md   │──►│ site/     [tcmP] 平台 │
  │ quiz.json    │   │ textbooks/build/ 教材 │
  │ outputs/     │──►│ outputs/  产物索引    │
  └──────────────┘   └──────────────────────┘

  反向引用 = bug：派生件一旦被当成输入，"重跑一次构建"就不再可预测。
```

| 层 | 本仓库 | 参考对应 | 门 |
|---|---|---|---|
| **L0 事实源（不可再生）** | `departments/` · `standards/materials/*/sources/` · `standards/knowledge-tree/sources/` · `standards/shanghan/` · `data/icd11/` | phases/ 里的内容 + 上游素材 | `npm run audit（L0 数据层）` |
| **L1 投影 / 索引（可重跑）** | `curriculum.json` · `catalog.json` · `standards/materials/*/source-map.json` | catalog.json ← build_catalog.py | `npm run counts` |
| **L2 内容（人写）** | `departments/**/chapters/**/docs/zh.md` · `departments/**/chapters/**/quiz.json` · `glossary/` · `learning-paths/` | lesson 的 docs/ 与 quiz.json | `npm run audit（L1 结构 / L2 契约 / L3 内容）` |
| **L3 交付物（两类）** | `site/` · `textbooks/build/` · `outputs/` | site/ + outputs/ | `npm run outputs（双向一致 / 缺口显式 / 不漂移）` |

- **L0 事实源（不可再生）**：目录树与原件。**只能来自域**，不能由本仓库算出来。
- **L1 投影 / 索引（可重跑）**：由 L0 扫出来的投影。**手改这里等于改错地方** —— 下次重跑就没了。
- **L2 内容（人写）**：唯一由人创作的层。形状由契约固定，内容整批替换。
- **L3 交付物（两类）**：[tcmP] 视频教育平台（site/ + platform/）与 [textbooks] 教材出版流水线。产物恰好两个文件：prompt-<base>.md + skill-<base>.md。

## 三、横切门（不挂在某一层上）

| 门 | 命令 | 守它的测试 |
|---|---|---|
| 审计 L0–L3 | `npm run audit` | `tests/test_audit_l3.js` |
| 计数一致 | `npm run counts` | `tests/test_forking_doc.js` |
| 链接完整 | `npm run links -- --strict` | `tests/test_links.js` |
| 产物索引不漂移 | `npm run outputs -- --check` | `tests/test_outputs_index.js` |
| 账本不漂移 | `npm run porting -- --check` | `tests/test_porting_map.js` |
| 全套测试 | `npm test` | `tests/run_all.js` |

`npm run check` 串起审计 + 计数 + 链接 + 两条「不漂移」检查。

## 四、四条数据流（架构在运行时的样子）

### 课程流（[tcmP] 的骨架）

`departments/  →  scripts/build_catalog.js  →  curriculum.json  →  site/pages.js  →  site/build.js  →  site/*.html`

目录树 → 投影 → 站点。**单向**：站点永远不写回 curriculum.json。

### 交付物流（产物账）

`departments/**/chapters/**/outputs/  →  scripts/build_outputs_index.js  →  outputs/index.json  →  outputs/README.md`

章节产物 → 索引。索引与文件系统**双向一致**，缺一个就报错。

### 检索流（语义层）

`standards/**/sources/  →  scripts/import_materials.js  →  scripts/build_embeddings.js  →  standards/semtensor/embeddings/index.json  →  scripts/tcm_api.js`

原件 → 抽取 → 编码 → 检索端点（/diag、/bianzheng、/semantic-search）。派生件不入库。

### 教材流（[textbooks] 的成品）

`standards/materials/*/sources/  →  scripts/import_materials.js  →  standards/materials/*/*.md  →  textbooks/build_book.js  →  textbooks/build/volume-1-sheng.html`

原件（xlsx）→ 导入成人读全本 md → 单文件书 HTML（自包含、离线、可点目录、带免责）。**派生件 content.json 不入库**，但源 xlsx 与 md 都入库 —— 前者不可再生，后者是交付物。

## 五、换域时动的是哪一层

这张表是「层不动、词替换」的逐条落地 —— **改动集中在工具层与域词，契约层几乎不动**。

| 参考 | 本仓库 | 落在哪层 | 改了什么 |
|---|---|---|---|
| phases/ | departments/ | L0 | 改名 + 深一层（2 层 → 3 层：院系/学科/章节） |
| lesson 目录四点 | chapters/<NN-slug>/ | L2 | docs → docs/zh.md（中文正文要求） |
| catalog.json | curriculum.json + catalog.json | L1 | 拆成课程树与目录两份投影 |
| outputs/ 的约定 | outputs/ | L3 | 从「目录里有什么」收紧为「文件内容达标」 |
| site/ | site/ + platform/ | L3 | 加视频平台线（截图/配音/合成），站点不再只是目录页 |
| requirements.txt（Python 栈） | 零第三方依赖 | 横切 | 换运行时；为读 xlsx 自写 lib_xlsx.js |

> 三条不变量（单一事实来源 / 课时契约 / 产物恰好两个）在 PORTING.md 第二节逐条展开，此处不重复 —— **同一条事实只写一处**，这也是本架构自己的逻辑。


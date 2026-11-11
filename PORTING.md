<!-- 本文件由 scripts/build_porting_map.js 从 porting-map.json 渲染，请勿手改。 -->

# 全链路账本：参考 ai-engineering-from-scratch → 本仓库

这份文档回答一个问题：**本仓库的哪一块，是从参考项目的哪一块来的，中途改了什么。**

参考快照实测路径：`D:/ai-engineering-from-scratch source code/ai-engineering-from-scratch-main`（量于 2026-10-14）

> 本机只剩这一份快照（此前记的 D:\ai-engineering-from-scratch-main 与 E:\GitHub\ai-engineering-from-scratch 实测**都不存在**）。路径不在时，测试跳过「新鲜度比对」，但结构比对照常 —— 账本不依赖参考仓库在线。

**账本不是散文**：本文每个「本仓库」路径与每条 `evidence` 都由 `tests/test_porting_map.js`
在文件系统上验真，本文自身也由渲染器查漂移。参考仓库不在本机时，新鲜度比对跳过，
结构比对不受影响。

## 一、参考侧实测清单（不引用记忆，全部现场列目录）

| 项 | 内容 |
|---|---|
| scripts/ | `_lib.py` · `audit_lessons.py` · `build_catalog.py` · `check_readme_counts.py` · `install_skills.py` · `lesson_run.py` · `link_check.py` · `scaffold_workbench.py` · `scaffold-lesson.sh` |
| 结构 | phases/<NN-slug>/<NN-slug>/：phase → lesson 两层，lesson 内含 code/ docs/ outputs/ quiz.json |
| 根文档 | `AGENTS.md` · `CHANGELOG.md` · `CODE_OF_CONDUCT.md` · `CONTRIBUTING.md` · `FORKING.md` · `LESSON_TEMPLATE.md` · `LICENSE` · `README.md` · `ROADMAP.md` · `SPONSORS.md` · `requirements.txt` · `vercel.json` |
| 目录 | `assets` · `glossary` · `outputs` · `phases` · `projects` · `scripts` · `site (32 文件)` · `web` |
| 运行时 | Python 3 + requirements.txt（含重依赖） |

### 参考侧漂移（新鲜度比对）

快照量于 **2026-10-14**，上游量于 **2026-10-29**（HEAD `fe6c657` · 2026-10-29）。

**上游 `scripts/` 有 93 个，本仓库据以移植的快照只有 9 个。**

上游新增 84 个（**未移植，逐一列在这里以免被静默忽略**）：

> `agent-machine/build.mjs` · `agent-machine/content.mjs` · `agent-machine/export.js` · `agent-machine/geometry.mjs` · `agent-machine/kit/LICENSE` · `agent-machine/kit/ink.mjs` · `agent-machine/kit/iso-kit.mjs` · `agent-machine/kit/lathe.mjs` · `agent-machine/kit/tube.mjs` · `agent-machine/live.js` · `agent-machine/model.mjs` · `agent-machine/page.css` · `audit_certifications.py` · `audit_manuals.js` · `audit_readme_locales.py` · `backfill_certification_references.py` · `build-favicons.js` · `build-og-fonts.js` · `build_book.py` · `build_readme_i18n.py` · `cheatsheets/generate.js` · `cheatsheets/prompt.md` · `cheatsheets/report.js` · `cheatsheets/test_generate.js` · `check_lesson_math.js` · `check_mcpa_wire.py` · `check_quiz_bias.py` · `check_translation_coverage.js` · `debias_certification_questions.py` · `debias_quizzes.py` · `decompiler-machine/build.mjs` · `decompiler-machine/capture.py` · `decompiler-machine/clock.mjs` · `decompiler-machine/content.mjs` · `decompiler-machine/fixture.mjs` · `decompiler-machine/geometry.mjs` · `decompiler-machine/live.js` · `decompiler-machine/model.mjs` · `decompiler-machine/page.css` · `decompiler-machine/parts.mjs` · `decompiler-machine/timing.mjs` · `find_plain_math.py` · `gpu-machine/build.mjs` · `gpu-machine/content.mjs` · `gpu-machine/data.mjs` · `gpu-machine/extract.mjs` · `gpu-machine/geometry.mjs` · `gpu-machine/hardware.mjs` · `gpu-machine/live.js` · `gpu-machine/materials.css` · `gpu-machine/model.mjs` · `gpu-machine/page.css` · `gpu-machine/parts.mjs` · `practice/generate.js` · `practice/prompt.md` · `practice/report.js` · `practice/run.py` · `practice/test_generate.js` · `practice/test_harness.py` · `practice/validate.py` · `preview-writing.js` · `print_cheatsheets.js` · `project_test.py` · `readme_translations.py` · `record_demo.py` · `run_lesson_tests.py` · `serve-agent-site.js` · `test_agent_api.js` · `test_agent_negotiation.js` · `test_agent_readiness.py` · `test_agent_wire.js` · `test_audit_readme_locales.py` · `test_book_rendering.py` · `test_check_mcpa_wire.py` · `test_function_bundles.js` · `test_link_check.py` · `test_seo_routes.js` · `test_skill_artifact_bundles.py` · `test_translate_ui_strings.py` · `test_translate_workflow.py` · `translate_lessons.py` · `translate_matrix.py` · `translate_ui_strings.py` · `translation_freshness.py`

上游新增顶层目录：`.claude` · `.github` · `api` · `book` · `certifications` · `cheatsheets` · `docs` · `i18n` · `learning-paths` · `lib` · `manuals` · `practice` · `research` · `skills`

**这份漂移不是"待办清单"，是事实记账**：参考项目在本仓库换域之后仍在长（上表里 `build_book.py`
对应本仓库独立长出来的 `textbooks/build_book.js`，方向撞上了；其余多数是 i18n / certifications
这类本仓库域内不需要的东西）。要刷新：`npm run porting -- --measure`。

## 二、先定的三个不变量（换域时唯一不能动的东西）

| 不变量 | 参考 | 本仓库 | 为什么是它 |
|---|---|---|---|
| **单一事实来源** | catalog.json ← build_catalog.py 从 phases/ 扫出 | curriculum.json ← build_catalog.js 从 departments/ 扫出 | 源必须是**文件**不是字段：目录树是事实，json 是它的投影。改目录树即改事实，不需要人同步两个地方。 |
| **课时契约** | lesson 必须含 code/ docs/ outputs/ quiz.json | chapter 必须含 code/ docs/zh.md outputs/ quiz.json | 契约照搬形状；docs/zh.md 是换域结果（参考是英文 lessons，本仓库要求中文正文）。 |
| **产物恰好两个** | LESSON_TEMPLATE.md 规定的 outputs/ 形状 | outputs/ 恰好两个文件：prompt-<base>.md + skill-<base>.md | 把「能过的门」从**存在**收紧为**内容**（H1 / 用途段 / ≥300 字 / frontmatter 三件套且 name === base），空壳过不去。 |

## 三、结构映射

| 参考 | 本仓库 | 关系 | 说明 |
|---|---|---|---|
| phases/ | departments/ | 改名 + 加深一层 | 参考是 phase → lesson 两层；本仓库是 院系 → 学科 → 章节 三层（1 领域 / 8 院系 / 120 学科 / 1086 章节）。分层加深是换域带来的，不是审美。 |
| lesson 目录（code/ docs/ outputs/ quiz.json） | chapters/<NN-slug>/（code/ docs/zh.md outputs/ quiz.json） | 形状照搬，docs 收紧为 docs/zh.md | 契约继承是这套架构能复用的核心：门、脚手架、站点渲染都只认这个形状。 |
| LESSON_TEMPLATE.md（单文件） | templates/（chapter-template.md / subject-template.md / meta-template.json / quiz-template.json） | 拆分 | 参考把模板写在一个 md 里；本仓库拆成 4 个文件，因为学科与章节是两层、各自要脚手架。 |

## 四、工具链映射（逐个脚本）

| 参考 | 本仓库 | 状态 | 守它的测试 |
|---|---|---|---|
| `scripts/_lib.py` | `scripts/lib.js` | 移植 | `tests/test_links.js` |
| `scripts/audit_lessons.py` | `scripts/audit_curriculum.js` | 移植+扩写 | `tests/test_audit_l3.js` |
| `scripts/build_catalog.py` | `scripts/build_catalog.js` | 移植 | `tests/test_curriculum_contract.js` |
| `scripts/check_readme_counts.py` | `scripts/check_readme_counts.js` | 移植 | `tests/test_forking_doc.js` |
| `scripts/link_check.py` | `scripts/check_links.js` | 移植 | `tests/test_links.js` |
| `scripts/scaffold_workbench.py` | `scripts/scaffold_subject.js`<br>`scripts/scaffold_chapter.js` | 拆分 | `tests/test_curriculum_contract.js` |
| `scripts/scaffold-lesson.sh` | `scripts/scaffold_chapter.js` | 合并 | `tests/test_curriculum_contract.js` |
| `scripts/lesson_run.py` | `tests/test_chapter_code.js` | 移植 | `tests/test_chapter_code.js` |
| `site/（32 文件）` | `site/` | 移植+扩写 | `tests/test_site_render.js` |
| `FORKING.md（59 行，讲 fork 给团队/学校/训练营用）` | `FORKING.md` | 移植+扩写 | `tests/test_forking_doc.js` |
| `glossary/（terms.md / myths.md）` | `glossary/` | 移植+扩写 | `tests/test_glossary_bridge.js` |
| `phases 的 outputs/ + 根 outputs/` | `outputs/` | 移植+扩写 | `tests/test_outputs_index.js` |

### 逐条说明

**`scripts/_lib.py` → `scripts/lib.js`**（移植）

共享工具（路径解析、markdown 读取）。本仓库另有 lib_xlsx.js / lib_metrics.js / dom-shim.js 三个参考里没有的库。

**`scripts/audit_lessons.py` → `scripts/audit_curriculum.js`**（移植+扩写）

**从三层扩到四层**：L0 数据 / L1 结构 / L2 契约 / **L3 内容**（引文《书名·篇名》/ 免责声明 / 代价与边界 / 最小篇幅）。L3 是逐条比完上游规则清单后补的 —— 上游对 docs 的**内容**要求当时无人查。

**`scripts/build_catalog.py` → `scripts/build_catalog.js`**（移植）

扫 phases/ 出 catalog.json → 扫 departments/ 出 curriculum.json + catalog.json。

**`scripts/check_readme_counts.py` → `scripts/check_readme_counts.js`**（移植）

README 里的声明数字必须与 catalog 逐项对齐，可 --fix。

**`scripts/link_check.py` → `scripts/check_links.js`**（移植）

内部链接完整性，--strict 给 CI。链接层级靠**量**不靠手数 ../（教训 4）。

**`scripts/scaffold_workbench.py` → `scripts/scaffold_subject.js` + `scripts/scaffold_chapter.js`**（拆分）

参考一个脚手架管一层；本仓库两层（学科 / 章节）各一个。

**`scripts/scaffold-lesson.sh` → `scripts/scaffold_chapter.js`**（合并）

shell 脚本并进 Node，去掉平台依赖。

**`scripts/lesson_run.py` → `tests/test_chapter_code.js`**（移植）

参考：逐课 py_compile 语法检查（可选 --execute，10s 超时，重依赖用 `# requires:` 跳过）。本仓库：跑每章 code/main.js 与其单元测试。

**`site/（32 文件）` → `site/`**（移植+扩写）

参考 32 文件 → 本仓库 26 文件。沿用 build.js / app.js / data.js / catalog.html 的骨架与**静态导出**思路；新增 semtensor.html + semtensor.js + sphere.js（三维极坐标语义球）、math.js、paths.html、progress.js、snapshot/。站点是 [tcmP] 交付物的一半。

**`FORKING.md（59 行，讲 fork 给团队/学校/训练营用）` → `FORKING.md`**（移植+扩写）

参考那份是「fork 走之后怎么用」；本仓库这份是「照着参考**造一门新课**」的规程 —— 五步流程 + 产物契约 + 四条质量门 + 六条教训 + 反模式 + 清单。需求不同，故扩写而非照抄。

**`glossary/（terms.md / myths.md）` → `glossary/`**（移植+扩写）

本仓库为 ai-terms.md / tcm-terms.md / bridge-map.md。术语表加了一层**桥接表**（bridge-map.md）：AI 术语 ↔ 中医术语的对应，这是换域的必要产物。

**`phases 的 outputs/ + 根 outputs/` → `outputs/`**（移植+扩写）

另加 standards/ 下的标准与产物。产物索引（build_outputs_index.js）是参考没有的：本仓库产物多，需要「双向一致 + 缺口显式 + 不漂移」的账。

## 五、未移植的（**显式记账，不是遗忘**）

| 参考 | 为什么没要 |
|---|---|
| `scripts/install_skills.py` | 参考用它把课程里的 skill 装进 Hermes；本仓库的 skill 分发不在范围内（教材/平台两条线不依赖它）。**未移植，不是遗忘**。 |
| `requirements.txt` | 参考是 Python 栈。本仓库**纯 Node 标准库、零第三方依赖**，故没有依赖清单可写；lib_xlsx.js 正是为此手写的 xlsx 读取器。 |
| `AGENTS.md` | 本机策略保护该文件名，**写不进去**。等价内容落 CONTRIBUTING.md —— 分歧显式记账，不静默对齐。 |
| `vercel.json / web/` | 参考的部署配置指向 Vercel。本仓库 sitemap/robots **只在配 SITE_ORIGIN 时生成**（不编假域名），部署目标未定，故不移植。 |

## 六、本仓库新增（参考里没有对应物）

共 22 个。换域之后必然长出来的东西 —— 参考是 AI 工程课，
本仓库是中医药教育体系，源材料是 xlsx/docx、交付物是平台与教材，工具链自然会分叉。

| 路径 | 为什么 |
|---|---|
| `scripts/build_dashboard.js` | 单文件项目看板，KPI 由仓库现状算出（与源独立重算比对） |
| `scripts/build_embeddings.js` | 源材料《中医知识树》embedding-code 八组件的纯 Node 实现（TF-IDF/BM25/RRF/ICD-11 双通道/知识树查询） |
| `scripts/lib_metrics.js` | 与上游 vectorization-ICD11 同口径的嵌入质量指标（轮廓/CH/DB/分离比/熵/保真度/符号准确率） |
| `scripts/icd11_embeddings.js` | 在上游同一份 ICD-11 数据上复现论文对照（仅标题 vs 标题+描述） |
| `scripts/icd11_client.js` | WHO ICD-11 双通道客户端（OAuth2 凭据路径 + 本地 NDJSON 父链还原章节） |
| `scripts/build_dsu_descriptions.js` | 证候描述从证据组装（构词解析 + 教材/外部证据 + WHO-TCM + 异名） |
| `scripts/external_batch.js` | 外部证据的分批取用与幂等入库（空结果不入库） |
| `scripts/evidence_quality.js` | 证据质量分级（特指/部分/待确认异名/仅证名/通用） |
| `scripts/tcm_api.js` | /diag 与 /bianzheng：逆转推理引擎（症状→病机→病位→六淫）+ A_jk 邪-脏矩阵 |
| `scripts/build_semtensor_datasets.js` | 语义张量数据集与三维极坐标渲染的派生构建 |
| `scripts/verify_semtensor_axiom.js` | 颜色公理校验（源内三处不一致已记账，未强行对齐） |
| `scripts/import_materials.js` | 源资料（xlsx/docx）解析入库，带 sources/ 原件 + sha256 溯源 |
| `scripts/import_knowledge_tree.js` | 《中医知识树》入库 |
| `scripts/import_shanghan_base.js` | 《伤寒论》条文入库 |
| `scripts/link_leijing_colors.js` | 《类经图翼》方位色彩分层对齐 |
| `scripts/build_doc_indexes.js` | 给 docs 生成索引页，使文档能被站内检索到而不是躺在目录里 |
| `scripts/build_outputs_index.js` | 产物索引（双向一致 + 缺口显式 + 不漂移） |
| `scripts/build_roadmap.js` | 路线图由现状算出（参考的 ROADMAP.md 是手维护的） |
| `scripts/lib_xlsx.js` | 手写 xlsx 读取器 —— 为零依赖而写（本机无 python/pandas） |
| `textbooks/build_book.js` | [textbooks] 交付物线：教材单文件书 HTML（自包含、离线、可点目录） |
| `scripts/probe_source_materials.js` | 源资料探查（解析前先看清单，不手抄） |
| `scripts/dom-shim.js` | 站点渲染测试用的最小 DOM 垫片 |

## 七、质量门（参考「不能省的四条」+ 本仓库加的一条）

| 门 | 命令 | 守它的测试 |
|---|---|---|
| 审计 L0–L3 | `npm run audit` | `tests/test_audit_l3.js` |
| 计数一致 | `npm run counts` | `tests/test_forking_doc.js` |
| 链接完整 | `npm run links -- --strict` | `tests/test_links.js` |
| 产物索引不漂移 | `npm run outputs -- --check` | `tests/test_outputs_index.js` |
| 全套测试 | `npm test` | `tests/run_all.js` |

`npm run check` 串起前四条；`npm test` 是全套。

## 八、怎么用这份账本

1. **参考项目更新了** → 跑 `tests/test_porting_map.js`：它会把参考 `scripts/` 的现场清单
   与账本里的清单比对，**多出新脚本就报错**（新东西不会被静默忽略）。
2. **本仓库改了工具链** → 改 `porting-map.json` 后跑 `node scripts/build_porting_map.js`，
   再跑测试。删了文件却没改账本，测试会红。
3. **照着参考造第三门课** → 先读 `FORKING.md`（规程），再读这份账本（先例：哪一步实际改了什么、为什么改）。


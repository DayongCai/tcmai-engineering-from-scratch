# 变更日志

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.0] — 2026-10-12

### 新增 · 课程架构

- `curriculum.json` 单一事实来源：**1 领域 × 8 院系 × 120 学科 × 1086 章节 × 7596 学时**
- 八院系：中医系 / 中药系 / 针灸系 / 骨伤系 / 护理系 / 管理系 / 智能系 / 五官口腔系，各 15 学科
- 进度轴「生长壮老已」五阶段 × 10 学期（大一至大五），继承自「医圣成长 · tcm-textbooks」的双根因共振模型
- `learning-paths/`：临床型 / 工程型 / 科研型 / 教学型 / 中医+AI 复合型 五条学分路径
- `glossary/`：中医术语表 + AI 术语表 + 中医↔AI 桥梁对照表

### 新增 · 章节契约

- 三层审计（L0 数据层 / L1 结构层 / L2 契约层），CI 阻断
- 章节骨架：`docs/zh.md`（MOTTO / PROBLEM / 双根因 / CONCEPT / BUILD IT / USE IT / SHIP IT）
  + `code/`（可运行、自终止、≥5 个测试）+ `quiz.json`（1 pre + 3 check + 2 post）+ `outputs/`
- 样板学科：中医系 · 中医基础理论（阴阳 / 五行 / 藏象 三章完整实现）

### 新增 · [tcmP] 网络视频教育平台

- `site/`：构建期数据管线（`curriculum.json` → `catalog.json` → `site/data.js` / `content.js`）+ 静态站点
- 页面：课程目录 / 学科页 / 章节页 / 路线图 / 学习路径 / 术语表 / 关于
- 6 张中医概念动画图（`site/figures.js`）：阴阳→二分类、五行生克、藏象图谱、四诊融合（含模态缺失）、腧穴 KD-Tree 检索、君臣佐使注意力
- 章节页内嵌可运行的实验台；小测分 1 前置 + 3 过程 + 2 课后三档
- 本机进度（`site/progress.js`）：只写 localStorage，不发起任何网络请求
- `site/snapshot.js`：把整站打成**单文件 HTML**，离线双击即可打开，便于分发与审阅
- `platform/`：讲稿 → TTS 旁白 → HTML/CSS 幻灯片 → MP4 的视频生产流水线
- 本地零依赖服务器 `site/serve.js`（含目录穿越防护）

### 新增 · [textbooks] 教材出版流水线

- `textbooks/`：每章 ≈6000 字教材稿，按「生 / 长 / 壮 / 老 / 已」汇成五卷
- `scripts/build_book.js`：Markdown → 分卷 PDF / EPUB

### 新增 · 工具链与 CI

- `scripts/`：`build_catalog` / `build_roadmap` / `build_doc_indexes` / `audit_curriculum` /
  `check_readme_counts` / `scaffold_subject` / `scaffold_chapter`（纯 Node.js 标准库，无第三方依赖）
- `scripts/dom-shim.js`：最小 DOM/browser shim，让客户端渲染的页面能在 Node 里被**真实执行**并断言。
  与 skill `curriculum-repo-engineering` **共用同一份实现**，仓库不另写副本 —— 两份测试夹具必然漂移，
  而漂移的夹具会给出虚假的信心。
- `.github/workflows/curriculum.yml`：audit（阻断）、chapters（阻断）、site-artifacts（阻断）、
  counts-drift（咨询）、rebuild-artifacts（main 自愈）、textbooks、video-pipeline
- `tests/`：8 个套件全部通过
  - `test_curriculum_contract` 课程结构与章节契约
  - `test_learning_paths` 学习路径引用与计数
  - `test_site_artifacts` 站点生成物形状与 manifest hash 一致性
  - `test_site_render` **渲染烟雾测试**：用 `scripts/dom-shim.js` 在 Node 里真跑 `app.js`，
    逐页渲染并断言内容 —— 22/22 通过
  - `test_glossary_bridge` 桥梁表分级（A/B/C/D）与双术语表
  - `test_chapter_code` 逐章运行 `main.js` 与单元测试（要求 ≥5 项、退出码 0、输出含边界声明）
  - `test_content_review` 人机闭环：机器可判的引文/免责规则 + 需中医背景复核的清单
  - `assert_disclaimers` 每集讲稿必须带**末位**免责声明卡

### 建设过程中由测试实际抓出并修正的缺陷

| 缺陷 | 抓出它的检查 |
|------|-------------|
| 权重全零时余弦约束梯度产生 `0/0 → NaN` | 第 2 章 `λ=0` 梯度对照测试 |
| 最短路径渲染把「金克木」写成「木克金」 | 第 3 章路径方向测试 |
| 相表里只建一侧边 → 「从腑查脏」静默失败 | 本体完整性校验 |
| 五行未建成节点 → `肝 → 悲` 路径不可达 | 最短路径测试 |
| 「纯 softmax 一定丢掉关系」的断言被实测推翻 | 第 2 章 λ 扫描 |
| 两个学科的 bridge 字段缺 `→` 分隔 | 课程结构契约测试 |
| 两章缺「翻译代价与临床边界」声明 | 内容复核测试 |
| `departments/**/docs/zh.md` 的 `**/` 提前闭合 JS 块注释 | 站点构建 |
| README 计数块漂移 | 计数一致性检查 |

[1.0.0]: https://github.com/

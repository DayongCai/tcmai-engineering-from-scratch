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

- `site/`：构建期数据管线（`curriculum.json` → `catalog.json` → `site/data.js`）+ 静态站点
- 页面：课程目录 / 学科页 / 章节页 / 路线图 / 学习路径 / 术语表 / 交互式实验台
- `platform/`：讲稿 → TTS 旁白 → HTML/CSS 幻灯片 → MP4 的视频生产流水线
- 本地零依赖服务器 `site/serve.js`

### 新增 · [textbooks] 教材出版流水线

- `textbooks/`：每章 ≈6000 字教材稿，按「生 / 长 / 壮 / 老 / 已」汇成五卷
- `scripts/build_book.js`：Markdown → 分卷 PDF / EPUB

### 新增 · 工具链与 CI

- `scripts/`：`build_catalog` / `build_roadmap` / `build_doc_indexes` / `audit_curriculum` /
  `check_readme_counts` / `scaffold_subject` / `scaffold_chapter`（纯 Node.js 标准库，无第三方依赖）
- `.github/workflows/curriculum.yml`：audit（阻断）、counts-sync、site-rebuild、counts-drift
- `tests/`：课程结构测试、CI 门测试、人机闭环内容复核清单

[1.0.0]: https://github.com/

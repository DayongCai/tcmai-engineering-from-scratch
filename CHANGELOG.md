# 变更日志

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.1.0] — 2026-10-12

### 新增 · [tcmP] 成片流水线打通（第 1 章真跑出 MP4）

- **`platform/pipeline/find_tools.js`**：外部工具探测收敛为单一模块（`check_tools` / `render_frames` /
  `synthesize_narration` / `build_video` 共用）。只有查 PATH 之外的落点才不会把「装了但没 export」误报成缺失。
- **`platform/pipeline/render_frames.js`**：幻灯片 → `frames/001.png …`（无头 Edge/Chrome，1920×1080）。
  幻灯片新增 `?shot=N` 单帧模式：只渲染第 N 张并藏掉其余，不靠估算滚动偏移。
- **`platform/pipeline/synthesize_narration.js`**：讲稿 → 配音，后端降级链 `edge-tts → Windows SAPI → 人工`。
  产出落到统一位置，`build_video.js` 只认「文件在不在」，不认「谁产的」。
- **`site/math.js`**：自研 LaTeX 子集渲染器（零依赖，约 250 行）—— 真上下标、真堆叠分式、
  希腊字母与算子映射、函数名正体、`\frac` / `\sqrt` / `\underbrace` 递归解析。
  同时收集**未知命令**并在构建时打印，避免公式静默退化成「去掉反斜杠的裸命令」。
- `tests/test_math_render.js`（18 项）、`tests/test_narration.js`（10 项）新增。

### 修复 · 实际抓出的缺陷

| 缺陷 | 症状 | 抓出它的检查 |
|------|------|-------------|
| 章节页**从未有过 `<video>` 播放器** | 只显示「视频已就绪」标签，成片无处可播 | 给「有视频→必须有播放器」补断言 |
| `serve.js` 只服务 `site/`，成片在 `platform/` | 播放器 404，**表现为一个永不播放的黑框** | 截图核对播放器区域 |
| `serve.js` 不支持 Range 请求 | 进度条不可拖、部分浏览器完全不播 | 请求头实测（改后 206） |
| 视频/教材计数读手工字段 `videosPublished` | 恒为 0，与文件系统事实不符 | 改为扫盘统计 |
| `build_video.js` 只在有 `edge-tts` 时才用配音 | SAPI/人工配音被静默忽略 | 改为「文件存在即采用」 |
| 时长用 `ffmpeg -show_entries` 读 | 非法调用静默失败，所有时长 `null`，日志只显示「时长未知」 | 改用 `ffprobe` |
| `site/build.js` 缺 `require('./math')` | 构建直接崩 | 构建期 |
| 公式渲染器不认识 `\|`（范数） | `\|a\|` 渲染成「去掉反斜杠的竖线」，看起来"差不多对" | 构建期未知命令告警 |
| 章节页标题重复渲染两次 | 页头卡片与正文 H1 连出两个一样的大标题 | 截图核对 |
| 题目讲稿里残留 `$\mathbf{x}$`、emoji、图形 id | TTS 会照念源码与「剪贴板」 | `test_narration.js` |
| 第 2 章讲稿是旧版产物（无 `spoken` 字段） | 静默用原文念稿 | `test_narration.js` |
| `test_narration` 要求纯散文段的 spoken 也须与 text 不同 | **断言本身错了**：motto/disclaimer 无可剥离内容，相同才是正确 | 改为只在含可剥离内容时断言 |

### 实测事实（可复核）

```text
第 1 章《阴阳学说 → 二分类》
  成片      video/lesson.mp4 · 5.7 MB · ffprobe 实测 368.9s（6 分 09 秒）
  视频流    h264 1920×1080 25fps
  音轨      aac 22050Hz 单声道 · mean_volume −24.7 dB（非静音）
  配音      12/12 段 · Windows SAPI（Microsoft Huihui Desktop）· 实测 5 分 47 秒
  画面帧    12/12 张 · msedge --headless=new
  幻灯片    12 张 · 站点与幻灯片共用同一套公式 CSS
```

`estimateSeconds`（4.6 字/秒）与 SAPI `Rate=-2` 实测（≈3.6 字/秒）有偏差：
第 1 章估算 4 分 09 秒、实测 5 分 47 秒。估算只用于排期，**成片时长一律由实测值决定**。

### 变更

- `.gitignore`：新增 `platform/**/frames/`、`platform/**/narration/audio/`、`platform/**/concat.txt`
  （数十 MB 中间产物，本地 13 秒可重建）。成片本身仍不入库，走 release 附件。
- 测试套件 8 → 10（新增公式渲染、讲稿质量）。
- 章节页：无成片时给出占位说明并指向 `platform/README.md`，不再静默留白。

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

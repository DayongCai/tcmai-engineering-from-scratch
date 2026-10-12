# 变更日志

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.2.0] — 2026-10-12

### 新增 · 三维极坐标语义张量（从桌面资料抽取的第一项技能）

把源资料里的《tcmP 三维极坐标语义张量 · 颜色赋值可视化标准 v1.0》落地为**可计算、可断言**的规范本体。

- **`standards/semtensor/规范-三维极坐标语义张量-v1.0.md`**：规范正文，含口径裁定（θ=仰角 / φ=方位角，
  与旧稿极角口径的换算）、颜色公理、DDG 球网格、画布规范、图注三段制、校验清单与 7 条待裁定项。
- **`standards/semtensor/axis-colors.json`**：机器可读常量（唯一来源）。站点、图注、测试一律读它，不复制色值。
- **`site/semtensor.js`**（约 550 行，零依赖）：球↔笛、颜色公理、母子父镜像、张量相似 S_T、尺度伸缩、
  域聚合、DDG 球网格与曲率、八纲确定性编码、图注 INI 解析。
- **`site/sphere.js`** + **`site/semtensor.html`**：三维极坐标球面交互视图 —— 正交投影、母子父三球共用相机
  同步旋转、点云按 r 定半径、透明度由离散法向驱动、三轴两段三点渐变 + T 端箭头、赤道/经线/阴阳界大圆、
  方位角标尺、悬停读数、图注面板（改文本即改图，三条实例化通道）。
- **数据集**（从源文件解析，不手抄）：
  - `reference-units.json`：源实现自带的 **116 个真实语义单元**（103 病证 + 六经域 6 + 四系统 4 + 精气神 3）——**站点默认数据集**；
  - `neijing-domains.json`：内经 12 语义域（162 篇 / 1323 章 / 3146 节 / 188166 字）；
  - `shanghan-domains.json`：伤寒论 9 域 28 集（285 分钟）。
- **`standards/semtensor/sources/`**：源实现交付物 HTML 原样入库（它是唯一的权威来源）。
- **测试 2 套**：`test_semtensor.js`（45 项，实现规范 §12 的硬证据清单）、
  `test_sphere_render.js`（21 项，渲染层）。测试套件 10 → 12。

### 新增 · 语义群字幕（从桌面资料抽取的第二项技能）

源资料里的网课生产法核心是「语义群推进 + 时间轴实测 + 对视音差可复核」。移植为
**`platform/pipeline/build_subtitles.js`**：

- 语义群 = 段（本仓库 docs 已按固定角色分段 ⇒ 字幕绝不在段内断开）；
- 时间轴取配音**实测**时长累加，估算值只在未合成配音时占位并显式标 `estimated: true`；
- 输出 `narration/subtitles.vtt`（标准 WebVTT）+ `subtitles.json`（含对齐报告）；
- 成片时由 `build_video.js` 以 `mov_text` 嵌入字幕轨，并**用 ffprobe 复核字幕轨真的在成片里**
  （不只看 ffmpeg 退出码）。

### 修复 · 由实测抓出的缺陷

| 缺陷 | 症状 | 抓出它的检查 |
|------|------|-------------|
| `-shortest` 没能把画面截到音频长度 | 每段画面比配音长 2.0–2.2s，12 段累计 **+21.8s**；画面看不出，字幕整体提前 | `build_subtitles.js` 的对视音差报告 |
| `el()` 工厂对 HTML 标签也用了 `createElementNS(SVG)` | 造出「未知 SVG 元素」，浏览器**完全不渲染**球面，控制台零报错 | 截图核对 + 新增命名空间断言 |
| 夹具的 `innerHTML` 不清空子节点 | 重绘逻辑在测试里叠加旧节点，「重绘后坐标变了吗」测的是不存在的环境 | 同步旋转断言 |
| 夹具的 `tagName` 大小写导致 `collect('linearGradient')` 全不匹配 | 报「缺渐变」，指向错误的地方 | 渐变断言 |
| 夹具缺 `location.protocol` | 读它的代码在测试里炸、在浏览器里正常 | 图注按需载入 |
| `site/build.js` 缺 `require('./math')` | 构建直接崩 | 构建期 |
| 章节页标题重复渲染两次 | 页头卡片与正文 H1 连出两个大标题 | 截图核对 |
| `curvatureDensity` 把顶点**坐标**当**下标**用 | TypedArray 用字符串下标静默无效 → 面积全 0、均值 NaN | Gauss–Bonnet 断言 |
| DDG 的 ring 0 落在南极却被接到北极点 | 三角面横跨球体互相覆盖，Σ面积反而 > 4π | Gauss–Bonnet 断言 |
| `splitByVisibility` 把「一个点」赋给 `cur.pts` 再 `.push` | 球面轮廓出现断缝 | 渲染断言 |
| 「站点不发起网络请求」的约定与图注按需载入冲突 | 约定被写得太宽，无法精确执行 | 把约定改写精确（禁外呼/禁上报，允许同源取静态文件） |

### 实测事实（可复核）

```
语义张量
  DDG 闭合球     V=3152 · F=6300 · E=9450 · Euler=2
  Σ角度亏损      12.5663706143585（4π = 12.5663706143592，差 6.5e-13）
  Σ面积          12.5503 < 4π ✓（内接多面体，必然小于球面积）
  曲率密度 K     均值 0.9989 · 面元加权 1.0013 · 最小 0.7517（极点三角）
  球面往返       2000 组 (θ,φ,r) 误差 < 1e-13
  镜像不变色     400 个随机点，母子父三球同色（且几何位置确实不同）
  comp(0,0,0)   #00B050 ✓
  源实现单元     116 个 · 色复现 2/116（见下）

成片与字幕（第 1 章）
  成片           video/lesson.mp4 · 5.6 MB · ffprobe 实测 347.2s
  字幕           12 条 · 全部为实测时长 · 文本与配音逐字一致
  对视音差       +0.022s（修复前 +21.842s）
  字幕轨         mov_text，已由 ffprobe 复核存在
```

### 关键技术判定：颜色公理的 `c_i` 未定义

书面规范写 `C = (1−k)·绿 + k·(Σ w_i·c_i / Σ w_i)`，**但没定义 `c_i`**。
两种读法（端色 / `ramp(v_i)`）对着源数据 116 个单元实测**都只有 2/116 吻合** —— 只在 `|v|=1` 的单轴点命中。

进一步查证：**源实现自身有两条互不相符的取色路径** ——
`DATA.units[].hex` 由 Python 编码器产出，而页面用 JS `comp()` 重算并**忽略** `hex` 字段。
同一单元，元数据说一种颜色、页面画另一种。

处理：不声称复现源系统配色；数据集同时保留 `colorSourceHex` 与 `colorDerived`；显式采用「端色」读法
并写明这是裁定（规范 §14.1）。验证脚本 `scripts/verify_semtensor_axiom.js` 可复核。

### 另一起实测发现

源数据的「气」节点是 `x=y=z=0` —— 正是书面规范未定义的三轴全零情形。
源 `hex` 给的是 `#00C7C7`（Z 轴 T 端青），按公理应回基准绿 `#00B050`。
**源数据在这一点上与自身公理不一致。** 本仓库取「基准绿 + `degenerate` 标记 + 空心点」，
与源数据不同，也不假装相同（规范 §14.6）。

### 变更

- 站点新增「语义张量」页（导航第 7 项），页面外壳 8 → 9。
- `scripts/dom-shim.js` 三处补齐：命名空间、`innerHTML` 语义、`location.protocol`。
- `site/snapshot.js` 与 `site/pages.js` 的脚本清单收敛为单一 `SCRIPTS` 数组（顺序有硬约束）。

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
- 本机进度（`site/progress.js`）：只写 localStorage；全站不向外部地址发请求、不上报任何本机数据
  （唯一的一处同源 fetch 是按需载入图注 `.txt`，不发送任何内容）
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

# [tcmP] 网络视频教育平台

参照 `ai-engineering-from-scratch` 的站点架构：**静态站点 + 构建期数据管线**，
本站点内容全部由仓库里的 Markdown 与 JSON 生成，页面不依赖后端。

```text
site/                       静态站点（课程目录 / 学科页 / 章节页 / 进度 / 路径 / 术语表）
  pages.js                  生成 8 个 HTML 外壳
  build.js                  curriculum.json + catalog.json + docs/zh.md → data.js / content.js
  app.js  md.js  figures.js  progress.js  serve.js
platform/                   视频生产与课程编排（本目录）
```

本地跑：

```bash
npm run site     # 生成 data.js / content.js
npm run serve    # http://localhost:7788
node site/snapshot.js   # 或打成单文件 HTML，离线双击即可打开
```

---

## 目录结构

```text
platform/
├── README.md                本文件
├── pipeline/
│   ├── find_tools.js        外部工具探测（三个脚本共用一份，不做二次实现）
│   ├── check_tools.js       工具可用性报告（ffmpeg / 浏览器 / TTS / pandoc）
│   ├── extract_narration.js docs/zh.md → narration/lesson.json（分镜 + text/spoken 分离）
│   ├── build_slides.js      docs/zh.md → slides/index.html（离线可放映；?shot=N 单帧模式）
│   ├── render_frames.js     slides → frames/001.png …（无头 Edge/Chrome，1920×1080）
│   ├── synthesize_narration.js spoken → narration/audio/00N.mp3（edge-tts → SAPI → 人工）
│   ├── build_subtitles.js   lesson.json → narration/subtitles.vtt（按语义群=段切分，绝不在段内断开）
│   └── build_video.js       frames + audio → video/lesson.mp4（需要 ffmpeg，缺则明确报错）
└── courses/
    └── <dept>/<subject>/
        ├── course.yaml      课程元数据 + 章节 → 视频映射（手工维护）
        ├── narration/       生成物：分镜脚本 + audio/ 配音（均不入库）
        ├── slides/          生成物：幻灯片
        ├── frames/          生成物：逐帧 PNG（不入库，几十 MB）
        └── video/           生成物：成片（不入库，见 .gitignore）
```

**单一事实来源是 `docs/zh.md`。** 讲稿、幻灯片、字幕全部从它派生，
不另存一份讲稿文本 —— 否则文档一改，视频就过期了。

---

## 流水线

| 阶段 | 命令 | 需要外部工具 | 产出 |
|------|------|-------------|------|
| 1 探测 | `node platform/pipeline/check_tools.js` | 否 | 工具可用性报告 |
| 2 讲稿 | `node platform/pipeline/extract_narration.js <course>` | 否 | `narration/lesson.json` |
| 3 幻灯片 | `node platform/pipeline/build_slides.js <course>` | 否 | `slides/index.html` |
| 4 画面帧 | `node platform/pipeline/render_frames.js <course>` | **需要 Edge / Chrome（无头）** | `frames/001.png …` |
| 5 配音 | `npm run tcmP:tts <course>` | **需要 TTS（见下）** | `narration/audio/00N.mp3` |
| 5.5 字幕 | `npm run tcmP:subtitles <course>` | 否 | `narration/subtitles.vtt` + `.json` |
| 6 成片 | `npm run tcmP:video <course>` | **需要 ffmpeg** | `video/lesson.mp4` |

第 2 段把文档拆成 `text`（原文，含代码/表格）与 `spoken`（可朗读文本，已剥离代码与 Markdown）。
这一步不能省：直接把文档喂给 TTS，念出来的会是「const gw 等于 左括号 0 逗号 0 右括号」。
`test_narration.js` 守着这条边界 —— 它会在 spoken 里检出残留的代码围栏、表格、LaTeX、emoji 与图形 id。

第 4 段用系统里已有的 Chromium 系浏览器逐张截图产出画面，尺寸 1920×1080。
为什么绕这一道：服务端渲染 SVG/Canvas 要额外依赖（resvg/cairo），ffmpeg 直接读 SVG 要
librsvg（官方构建默认不带），而**浏览器的无头截图是唯一零新增依赖、且渲染结果与人工放映一致**的路径。
幻灯片页为此提供了 `?shot=N` 单帧模式 —— 每张图正好一屏，不靠估算滚动偏移（估偏移在别的机器上必然错位）。

**任一段缺工具都会明确报错并给出安装命令，不会伪造输出。** 这是刻意的设计：
本项目所有"跑通了"的声明都必须能被复核。

### 本机实测状态

```text
ffmpeg           ✅ 可用（gh-proxy 镜像安装，见下文）
ffprobe          ✅ 可用   → 成片时长可实测校验
headless-browser ✅ 可用   (msedge.exe)  → 第 3.5 段画面帧导出
tts              ✅ 可用   (Windows SAPI · Microsoft Huihui Desktop，离线)
pandoc           ⬚ 缺失   → [textbooks] 的 PDF/EPUB 排版不可用（Markdown 汇总可用）
```

第 1 章《阴阳学说 → 二分类》已走完整链：**1920×1080 / 25fps / 12 段配音 / 6 分 09 秒 / 5.7 MB**。
`ffprobe` 实测时长 368.9s，音轨 `mean_volume −24.7 dB`（非静音）。

---

## 配音：为什么有三条链

成片流水线里最脆的一环是 TTS —— 它跟「内容写得好不好」毫无关系，却能整体卡住出片。
所以 `synthesize_narration.js` 按可用性依次尝试，并把**实际用了哪条链**写进讲稿 JSON 与日志：

| 优先级 | 后端 | 前提 | 音质 |
|--------|------|------|------|
| 1 | `edge-tts` | `pip install edge-tts`（需 python） | 最好 |
| 2 | Windows SAPI | 系统装了中文语音包（`Microsoft Huihui Desktop` 等） | 可用、离线 |
| — | 人工录音 | 把 `001.mp3 …` 放进 `narration/audio/` | 你自己定 |

三条链产出落到**同一个位置**，`build_video.js` 只认「文件在不在」，不认「谁产的」。
这条设计有实际原因：把判据写成「有 edge-tts 才用配音」，会让 SAPI 或人工录的配音被静默忽略，
而日志看起来只是「TTS 缺失」—— 你会去修一个没坏的东西。

实测踩到的坑（已写进代码注释）：

- **`edge-tts` 会 403**：微软的 readaloud 端点改签名后，旧版客户端直接 `403 Invalid response status`。
  不是你的网络问题，是上游接口变了 —— 所以别把成片能力绑死在单一云端 TTS 上。
- **时长必须用 `ffprobe` 读**：`ffmpeg -show_entries …` 不是合法调用，它会静默失败，
  于是所有时长变成 `null`，日志只显示「时长未知」——看起来像功能没写，实际是调错了工具。
- **估算速率偏快**：`estimateSeconds` 按 4.6 字/秒 排期，而 SAPI 在 `Rate=-2`（教材语速）下实测约
  **3.6 字/秒**。第 1 章估算 4 分 09 秒、实测 5 分 47 秒。估算只用于排期，**成片时长一律由实测值决定**。

---

## ffmpeg 装不上怎么办

`winget install Gyan.FFmpeg` 在无外网的环境里会失败，报错长这样：

```text
正在下载 https://github.com/GyanD/codexffmpeg/releases/download/9.0.2/ffmpeg-9.0.2-full_build.zip
执行此命令时发生意外错误：
InternetOpenUrl() failed.
0x80072efd : unknown error
```

`0x80072efd` 是「连接被重置」。winget 的包源和包体都在 `github.com` 上，所以被墙就全断。
**用镜像代理直取 release 包**（本机实测可用，~1.4 MB/s）：

```bash
VER=9.0.2
ASSET=ffmpeg-${VER}-essentials_build.zip        # essentials 更小；要全量换成 full_build.zip
MIRROR=https://gh-proxy.com/https://github.com/GyanD/codexffmpeg/releases/download/${VER}

mkdir -p "$LOCALAPPDATA/ffmpeg" && cd "$LOCALAPPDATA/Temp"
curl -L --retry 3 -o ffmpeg-dl.zip "$MIRROR/$ASSET"
unzip -q ffmpeg-dl.zip -d "$LOCALAPPDATA/ffmpeg"
```

然后把 `bin/` 加进用户 PATH（`setx` 对之后新开的进程生效；当前会话需手动 export）：

```bash
BIN=$(find "$LOCALAPPDATA/ffmpeg" -maxdepth 2 -type d -name bin | head -1)
setx PATH "$BIN;%PATH%"                      # 持久化；注意 setx 有 1024 字符长度上限
export PATH="$(cygpath -u "$BIN"):$PATH"     # 当前 bash 会话
ffmpeg -version && ffprobe -version
```

### 其他可用的镜像

按本机实测的连通性排序，逐个试：

| 镜像 | 形态 | 备注 |
|------|------|------|
| `https://gh-proxy.com/https://github.com/...` | 前缀代理 | 本机实测可用 |
| `https://ghproxy.net/https://github.com/...` | 前缀代理 | 本机实测可连通 |
| `https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip` | 厂商直链 | 非 GitHub，可作备选 |

**注意：不要为了"跑通"而在缺工具时改成生成占位文件。** 一张假帧、一个假 MP4 会一路混进成片，
而且没人能看出来 —— 这比功能缺失坏得多。

---

## course.yaml

```yaml
id: 01-zhongyi-jichu-lilun
title: 中医基础理论
dept: 01-zhongyi
semester: 1
stage: sheng
chapters:
  - slug: 01-yin-yang-er-fenlei
    title: 阴阳学说 → 二分类：从零实现逻辑回归
    video: pending        # pending | rendered | published
    duration_estimate: 18 # 分钟
```

`chapters[].slug` 必须与 `departments/<dept>/<subject>/chapters/` 下的目录名一致，
否则 `extract_narration.js` 会报错退出（不静默跳过）。

---

## 分镜脚本格式

`narration/lesson.json`：

```json
{
  "course": "01-zhongyi-jichu-lilun",
  "chapter": "01-yin-yang-er-fenlei",
  "title": "第 1 章 · 阴阳学说 → 二分类",
  "totalSeconds": 1020,
  "segments": [
    {
      "n": 1,
      "role": "motto",
      "text": "「阴阳者，天地之道也……」——《素问·阴阳应象大论》",
      "seconds": 12,
      "slide": "title"
    }
  ]
}
```

`role` 取值与 `docs/zh.md` 的七段结构一一对应：

| role | 来源段落 | 画面 |
|------|---------|------|
| `motto` | MOTTO | 标题卡 |
| `problem` | PROBLEM | 问题卡 |
| `roots` | 双根因定位 | 双根因卡 |
| `objectives` | 学习目标 | 要点列表 |
| `concept` | 核心概念 | 概念卡 + bridge 表 |
| `figure` | `<div data-figure="...">` | 动画图（在幻灯片里挂载同名图形） |
| `build` | BUILD IT 代码块 | 代码逐行 |
| `use` | USE IT | 对比卡 |
| `ship` | SHIP IT | 产出物清单 |
| `verify` | 验证 | 终端输出 |
| `disclaimer` | 固定 | 免责声明卡（每集末尾必须出现） |

---

## 硬规则

1. **每集结尾必须有免责声明卡。** `disclaimer` 段不可省略，不可缩短。
2. **讲稿不从 `outputs/` 取。** 产出物是给学习者的工具，不是讲稿素材。
3. **成片不入库。** `platform/**/video/*.mp4` 在 `.gitignore` 里；成片走 release 附件。
4. **不伪造时间轴。** 字幕时间码必须来自真实的音频时长或 TTS 返回的时长，不许按字数估算后当成实测。
5. **缺工具就报错。** 任何"降级为占位文件"的行为都要在输出里显式打印 `[跳过]` 与原因。

---

## 视频 → 站点

`site/build.js` 会检查 `platform/courses/<dept>/<subject>/<chapter>/video/` 是否存在，
存在则在章节页渲染 `<video>` 播放器。所以站点不需要额外配置 —— **视频一放在正确位置就自动上线**。

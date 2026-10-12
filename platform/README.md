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
│   ├── check_tools.js       探测外部工具链（ffmpeg / edge-tts / pandoc）可用性
│   ├── extract_narration.js docs/zh.md → narration/*.json（分镜脚本 + 时长估算）
│   ├── build_slides.js      docs/zh.md → slides/index.html（离线可放映的幻灯片）
│   └── build_video.js       slides + narration → MP4（需要 ffmpeg，缺则明确报错）
└── courses/
    └── <dept>/<subject>/
        ├── course.yaml      课程元数据 + 章节 → 视频映射（手工维护）
        ├── narration/       生成物：分镜脚本
        ├── slides/          生成物：幻灯片
        └── video/           生成物：成片（不入库，见 .gitignore）
```

**单一事实来源是 `docs/zh.md`。** 讲稿、幻灯片、字幕全部从它派生，
不另存一份讲稿文本 —— 否则文档一改，视频就过期了。

---

## 四段流水线

| 阶段 | 命令 | 需要外部工具 | 产出 |
|------|------|-------------|------|
| 1 探测 | `node platform/pipeline/check_tools.js` | 否 | 工具可用性报告 |
| 2 讲稿 | `node platform/pipeline/extract_narration.js <course>` | 否 | `narration/lesson.json` |
| 3 幻灯片 | `node platform/pipeline/build_slides.js <course>` | 否 | `slides/index.html` |
| 4 成片 | `node platform/pipeline/build_video.js <course>` | **需要 ffmpeg（+ 可选 TTS）** | `video/lesson.mp4` |

**第 4 段缺工具时会明确报错并给出安装命令，不会伪造输出。** 这是刻意的设计：
本项目所有"跑通了"的声明都必须能被复核。

### 本机实测状态

```text
ffmpeg     缺失   → 第 4 段（成片）不可用；第 1–3 段完全可用
ffprobe    缺失   → 无法探测已生成视频的时长
pandoc     缺失   → [textbooks] 的 PDF/EPUB 排版不可用（Markdown 汇总可用）
edge-tts   缺失   → 旁白配音不可用（可用 narration/lesson.json 里的文本做人工配音或替代 TTS）
```

> 这意味着：**本目录能生成讲稿与幻灯片，但不能生成 MP4。**
> 需要成片时先装 ffmpeg，再重跑第 4 段。第 4 段的代码已写好并会在缺工具时给出明确提示。

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

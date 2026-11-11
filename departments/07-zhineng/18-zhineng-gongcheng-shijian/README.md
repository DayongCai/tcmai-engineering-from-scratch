# 工程实践与系统交付

> 需求→用例与验收标准 / 模型→评测流水线 / 上线→监控指标

| 项目 | 内容 |
|------|------|
| 院系 | 🤖 智能系 `07-zhineng` |
| 类型 | Build |
| 学期 | 第 9 学期（🍂 老·固化 / 大五上） |
| 学时 | 108 |
| 章节目标 | 6 |
| 学科编号 | 153 / 188 |
| 英文名 | Engineering Practice & Delivery |

## 一、学科定位

工程实践与系统交付（Engineering Practice & Delivery）是智能系的核心学科，聚焦「中医 x 人工智能：架构、数据、模型、设备与治理（本项目的工程引擎）」中的一个完整知识域。

## 二、中医 → AI 桥梁

```text
需求→用例与验收标准 / 模型→评测流水线 / 上线→监控指标
```

工程实践与系统交付 里的每一个传统概念，都被翻译成一个可计算、可验证的工程对象：
中医概念给出**语义与约束**，AI/工程方法给出**表示与算法**。两者必须能互相回指，
否则这个章节就还没有写完。

## 三、章节地图（目标 6 章）

章节尚未编写。运行脚手架开章：

```bash
node scripts/scaffold_chapter.js 07-zhineng/18-zhineng-gongcheng-shijian 01-<chapter-slug>
```

编写完成后，把章节索引写进 `chapters.json`，本表的「状态」列由
`scripts/build_catalog.js` 自动填充。

## 四、章节契约（每章必须满足）

```text
chapters/NN-<slug>/
├── docs/zh.md      # MOTTO / PROBLEM / 环境逼迫 / 知识积累 / CONCEPT / BUILD IT / USE IT / SHIP IT
├── code/           # 可运行、自终止、退出码 0（Node.js 或 Python，见 CONTRIBUTING.md 依赖白名单）
├── quiz.json       # 恰好 6 题 = 1 pre + 3 check + 2 post
└── outputs/        # 可复用产出物（prompt / skill / agent / mcp / 临床工具）
```

## 五、教材交付 [textbooks]

```text
输出: textbooks/07-zhineng/18-zhineng-gongcheng-shijian/
├── 00-前言.md
├── 01-第1章-<标题>.md   ...
└── figures/                # Mermaid / SVG，禁止 ASCII 框图
```

## 六、平台交付 [tcmP]

```text
输出: platform/courses/07-zhineng/18-zhineng-gongcheng-shijian/
├── course.yaml             # 课程元数据 + 章节 → 视频映射
├── slides/                 # 讲稿 HTML（由 docs/zh.md 派生）
├── narration/              # TTS 旁白文本 + 音频
└── video/                  # 成片 MP4（H.264 / 720p 以上）
```

## 七、进度

| 指标 | 当前 | 目标 |
|------|------|------|
| 章节 | 0 | 6 |
| 视频 | 0 | 6 |
| 教材字数 | 0 | ≈ 36000 |

> 状态字形：🌱 未开始 ⬚ · 🚧 进行中 · ✅ 完成

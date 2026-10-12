# 医疗保险与卫生经济

> 医保支付→成本效果分析 / 费用预测→时间序列

| 项目 | 内容 |
|------|------|
| 院系 | 📊 管理系 `06-guanli` |
| 类型 | Reference |
| 学期 | 第 6 学期（🌿 长·积累 / 大三） |
| 学时 | 54 |
| 章节目标 | 8 |
| 学科编号 | 084 / 120 |
| 英文名 | Health Insurance & Economics |

## 一、学科定位

医疗保险与卫生经济（Health Insurance & Economics）是管理系的核心学科，聚焦「中医药治理、政策、教育与卫生经济、卫生信息化」中的一个完整知识域。

## 二、中医 → AI 桥梁

```text
医保支付→成本效果分析 / 费用预测→时间序列
```

医疗保险与卫生经济 里的每一个传统概念，都被翻译成一个可计算、可验证的工程对象：
中医概念给出**语义与约束**，AI/工程方法给出**表示与算法**。两者必须能互相回指，
否则这个章节就还没有写完。

## 三、章节地图（目标 8 章）

章节尚未编写。运行脚手架开章：

```bash
node scripts/scaffold_chapter.js 06-guanli/09-yiliao-baoxian-jingji 01-<chapter-slug>
```

编写完成后，把章节索引写进 `chapters.json`，本表的「状态」列由
`scripts/build_catalog.js` 自动填充。

## 四、章节契约（每章必须满足）

```text
chapters/NN-<slug>/
├── docs/zh.md      # MOTTO / PROBLEM / 环境逼迫 / 知识积累 / CONCEPT / BUILD IT / USE IT / SHIP IT
├── code/           # 可运行、自终止、退出码 0（Node.js 或 Python，见 AGENTS.md 依赖白名单）
├── quiz.json       # 恰好 6 题 = 1 pre + 3 check + 2 post
└── outputs/        # 可复用产出物（prompt / skill / agent / mcp / 临床工具）
```

## 五、教材交付 [textbooks]

```text
输出: textbooks/06-guanli/09-yiliao-baoxian-jingji/
├── 00-前言.md
├── 01-第1章-<标题>.md   ...
└── figures/                # Mermaid / SVG，禁止 ASCII 框图
```

## 六、平台交付 [tcmP]

```text
输出: platform/courses/06-guanli/09-yiliao-baoxian-jingji/
├── course.yaml             # 课程元数据 + 章节 → 视频映射
├── slides/                 # 讲稿 HTML（由 docs/zh.md 派生）
├── narration/              # TTS 旁白文本 + 音频
└── video/                  # 成片 MP4（H.264 / 720p 以上）
```

## 七、进度

| 指标 | 当前 | 目标 |
|------|------|------|
| 章节 | 0 | 8 |
| 视频 | 0 | 8 |
| 教材字数 | 0 | ≈ 48000 |

> 状态字形：🌱 未开始 ⬚ · 🚧 进行中 · ✅ 完成

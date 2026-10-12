# [textbooks] 120 门学科教材

这是与 **[tcmP]** 并列的第二类交付物。

| | [tcmP] 视频平台 | [textbooks] 教材 |
|---|---|---|
| 载体 | 站点 + 视频 | Markdown → PDF / EPUB |
| 讲什么 | **怎么做** —— 一步步跑通 | **为什么这样做** —— 概念、出处、边界 |
| 读者 | 边看边敲 | 系统阅读与查证 |
| 长度 | 每章 ≈10 分钟 | 每章 ≈6000 字 |
| 同源 | ✅ 都从 `chapters/<slug>/docs/zh.md` 派生的事实出发 | |

**同源不同体。** 教材不是课程文档的复制，重心从「代码怎么跑」转到「这个翻译为什么成立、
哪里不成立、历代医家怎么讲」。但两者引用的事实（配属表、经典出处、关系方向）
必须完全一致 —— 一旦不一致，就是有一处写错了。

---

## 目录结构

```text
textbooks/
├── README.md              本文件
├── volumes.json           五卷定义（生 / 长 / 壮 / 老 / 已）
├── build_book.js          汇总 → build/<volume>.md，PDF/EPUB 需 pandoc
└── <dept>/<subject>/
    ├── 00-前言.md
    ├── 01-第1章-<标题>.md
    ├── 02-第2章-<标题>.md
    ├── figures/           Mermaid / SVG（禁止 ASCII 框图）
    └── build/             生成物：分卷 markdown、PDF、EPUB
```

---

## 五卷

| 卷 | 阶段 | 学期 | 主题 |
|---|---|---|---|
| 一 | 🌱 生 · 启蒙 | 1–4 | 把中医的语法讲成可计算的对象 |
| 二 | 🌿 长 · 积累 | 5–6 | 经典、临床各科与表示的建立 |
| 三 | 🌳 壮 · 鼎盛 | 7–8 | 从表示走到系统 |
| 四 | 🍂 老 · 固化 | 9 | 临床轮转中的系统检验 |
| 五 | 🔄 已 · 转型 | 10 | 毕业设计与知识移交 |

分卷定义见 [volumes.json](volumes.json)。

---

## 教材章契约

每章 `NN-第N章-<标题>.md` 必须包含：

```markdown
# 第 N 章 · <标题>

> **本章要回答的问题:** <一句话>

## N.1 概念与出处
   逐条给出经典原文或标准出处，写清「书名·篇名」或标准号

## N.2 为什么可以这样翻译
   把中医命题 → 形式化表示的推理过程写出来，而不是只给结论

## N.3 这个翻译丢掉了什么
   必须写。没有一节「丢失了什么」的教材，是在骗人

## N.4 与相邻学科的接口
   本章的概念在哪些其他学科被用到，以什么形式被用到

## N.5 争议与本项目立场
   学界有分歧的地方，给出各方观点，并说明本项目采用哪一说、为什么

## 本章小结
## 思考题
## 延伸阅读
```

### 硬规则

1. **每章必须有「这个翻译丢掉了什么」一节。** 这是本项目教材与一般教材最大的区别。
2. **出处写到篇名/标准号级别。** 「详见某教材」不算出处。
3. **图只用 Mermaid 或 SVG。**
4. **引文必须可核查。** 引用经典原文时，原文必须逐字准确；不确定就不引。
5. **与章节文档的事实必须一致。** 配属表、关系方向、数值结论，两处必须能对上。
6. **临床内容必须带免责声明。**

---

## 构建

```bash
# 汇总某卷为单个 Markdown（无需外部工具）
node textbooks/build_book.js --volume 1

# 全部卷
node textbooks/build_book.js --all

# 校核：教材与章节文档的事实一致性
node textbooks/build_book.js --check
```

PDF / EPUB 需要 `pandoc`：

```bash
node textbooks/build_book.js --volume 1 --pdf
```

**缺 pandoc 时会明确报错，不生成占位 PDF。** 当前本机状态：pandoc 缺失（见
`node platform/pipeline/check_tools.js` 的探测结果），因此 **Markdown 汇总可用，PDF 不可用**。

---

## 进度追踪

教材进度记在每门学科的 `meta.json` 里：

```json
"textbook": {
  "id": "textbooks",
  "path": "textbooks/01-zhongyi/01-zhongyi-jichu-lilun",
  "chaptersWritten": 1,
  "words": 6200,
  "status": "wip"
}
```

`scripts/build_roadmap.js` 会把这两个数字读进 `ROADMAP.md` 与站点进度页。
**填数字时必须实测**（用 `build_book.js --check` 输出的字数），不许估。

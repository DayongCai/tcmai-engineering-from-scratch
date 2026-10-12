# 产出物索引

> 本章节由 `scripts/build_outputs_index.js` **生成**，请勿手改；重跑脚本同步。

> **6** 件产出物 · 覆盖 **3** 个章节 · prompt 3 · skill 3

## 这是什么

每章的 `outputs/` 交出两件**可复用**的东西（契约见 [CONTRIBUTING.md](../CONTRIBUTING.md)）：

| 产物 | 是什么 | 拿来做什么 |
| --- | --- | --- |
| `prompt-<base>.md` | 提示词 | 让大模型按本章的判断格式输出 |
| `skill-<base>.md` | 技能（带 frontmatter） | 把本章的流程固化成可复用操作 |

这两件是「工程化」与「讲课」的分界 —— 代码能跑只证明写对了，**能交出去复用**才算工程化。

浏览页：[index.html](index.html)（自包含，可离线打开）· 机器可读：[index.json](index.json)

## 按院系浏览

| 院系 | 学科 | 章节 | 产出物 |
| --- | --- | --- | :-: |
| ☯️ 中医系 | 中医基础理论 | 3 | 6 |

## ☯️ 中医系

### 中医基础理论

> Core · 第 1 学期 · 已产出 3 章

#### 第 1 章 · 阴阳学说 → 二分类：从零实现逻辑回归

`01-zhongyi-jichu-lilun/chapters/01-yin-yang-er-fenlei/`

| 类型 | 标题 | 说明 | 字数 | 文件 |
| --- | --- | --- | :-: | --- |
| prompt | Prompt · 阴阳倾向结构化归因 | — | 1234 | [`prompt-yin-yang-er-fenlei.md`](../departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/01-yin-yang-er-fenlei/outputs/prompt-yin-yang-er-fenlei.md) |
| skill | 阴阳倾向结构化判别 | 把四诊体征结构化为阴阳倾向判断（含置信度与拒答条件），并逐项给出可核查理由。 | 1322 | [`skill-yin-yang-er-fenlei.md`](../departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/01-yin-yang-er-fenlei/outputs/skill-yin-yang-er-fenlei.md) |

#### 第 2 章 · 五行学说 → 多分类：从零实现 Softmax（并检验生克约束是否真的有用）

`01-zhongyi-jichu-lilun/chapters/02-wu-xing-duo-fenlei/`

| 类型 | 标题 | 说明 | 字数 | 文件 |
| --- | --- | --- | :-: | --- |
| prompt | Prompt · 加约束前的基线测量 | — | 1300 | [`prompt-wu-xing-duo-fenlei.md`](../departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/02-wu-xing-duo-fenlei/outputs/prompt-wu-xing-duo-fenlei.md) |
| skill | 五行归类的可归因流程 | 五行归类必须给出所依据的配属维度，并显式标注生克关系一致性；资料不足时标记不确定。 | 1612 | [`skill-wu-xing-duo-fenlei.md`](../departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/02-wu-xing-duo-fenlei/outputs/skill-wu-xing-duo-fenlei.md) |

#### 第 3 章 · 藏象学说 → 知识图谱：脏腑关系的图表示

`01-zhongyi-jichu-lilun/chapters/03-zang-xiang-tupu/`

| 类型 | 标题 | 说明 | 字数 | 文件 |
| --- | --- | --- | :-: | --- |
| prompt | Prompt · 藏象关系链整理（带方向校验） | — | 1943 | [`prompt-zang-xiang-tupu.md`](../departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/03-zang-xiang-tupu/outputs/prompt-zang-xiang-tupu.md) |
| skill | 藏象关系链抽取与校验 | 把症状串成藏象关系链，每一步标注关系类型与方向，跨五行时显式标出相生相克。 | 1670 | [`skill-zang-xiang-tupu.md`](../departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/03-zang-xiang-tupu/outputs/skill-zang-xiang-tupu.md) |

## 缺口

无：所有已建章节都交齐了 prompt 与 skill。

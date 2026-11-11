# 中医整脊学

**13-zhongyi-zhengji-xue** · 骨伤学院 · 8 章 · 40 单元 · 99,918 汉字

> 整脊不是「掰响」，是可解释的力学与序列调整；先排禁忌再动手

**课程类型：派生课（无独立教材）**。单元正文逐字取自父课，`locator` 一律 `派生·第N章·m.k`，
`source` 记 `父课:父locator`；本课汉字**不与父课相加**。

## 一、父课

- `gushang-jichu`
- `gushang-jizhu-bing`
- `gushang-yingxiang`
- `shoufa`
- `zhenggu`

## 二、章表

| # | 章 | 父课来源 | 单元 | 汉字 |
|--:|---|---|--:|--:|
| 1 | 整脊源流与理论 | zhenggu、shoufa | 6 | 10,419 |
| 2 | 脊柱解剖与生物力学 | zhenggu、gushang-jichu | 6 | 11,988 |
| 3 | 影像评估与适应证 | gushang-yingxiang、zhenggu | 6 | 11,927 |
| 4 | 整脊手法体系 | zhenggu、shoufa | 3 | 18,979 |
| 5 | 颈椎整脊 | zhenggu、gushang-jizhu-bing | 4 | 11,695 |
| 6 | 胸腰椎整脊 | zhenggu、gushang-jizhu-bing | 5 | 11,332 |
| 7 | 骨盆与下肢力线 | zhenggu、zhiliao | 5 | 11,706 |
| 8 | 风险、禁忌与疗效评价 | zhenggu、gushang-jizhu-bing | 5 | 11,872 |

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
| **脊柱力学** | **1043** |
| **手法整复** | **1127** |
| **评估与风险** | **937** |

三辨极差 **1.2×**。三辨 1.2×——整脊的力学、手法、风险三块在教材里几乎是等重的，这是本库最平的一套。

| 四位面（章群结构分区） | 汉字 |
|---|---:|
| 理论与影像 | 34,334 |
| 手法与颈椎 | 30,674 |
| 胸腰骨盆 | 23,038 |
| 风险与疗效 | 11,872 |

四位面极差 **2.9×**（结构分区，不用词频）。

## 四、判据

整脊不是「掰响」，是可解释的力学与序列调整；先排禁忌再动手。每章要求写清：**适应证与禁忌、操作/适配要点、可核的记录项、随访节点**。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "13-zhongyi-zhengji-xue"
node tests/test_chapter_code.js | grep -c "13-zhongyi-zhengji-xue"
python scripts/_derive_gs2.py
```

**免责声明：** 本课为教学材料；无独立教材，内容为本库已建课程的**二次编排**。
手法、支具适配与评定须由执业人员执行，不构成诊疗建议。

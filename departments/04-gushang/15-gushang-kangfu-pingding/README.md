# 骨伤康复评定

**15-gushang-kangfu-pingding** · 骨伤学院 · 8 章 · 25 单元 · 279,598 汉字

> 评定不是打分，是给下一个决策提供依据；选错量表比不评更糟

**课程类型：派生课（无独立教材）**。单元正文逐字取自父课，`locator` 一律 `派生·第N章·m.k`，
`source` 记 `父课:父locator`；本课汉字**不与父课相加**。

## 一、父课

- `gushang-yingxiang`
- `huli-yanjiu-zhengxun`
- `kangfu-huli`
- `laonian-huli`
- `shoufa`
- `zhenjiu-zhiliao`

## 二、章表

| # | 章 | 父课来源 | 单元 | 汉字 |
|--:|---|---|--:|--:|
| 1 | 康复评定概论 | kangfu-huli、gushang-jichu | 3 | 51,332 |
| 2 | 关节活动度与肌力评定 | kangfu-huli、shoufa | 3 | 25,372 |
| 3 | 平衡与步态评定 | kangfu-huli、laonian-huli | 3 | 50,712 |
| 4 | 日常生活活动与生活质量 | kangfu-huli、jichu-huli | 3 | 50,811 |
| 5 | 疼痛与心理评定 | kangfu-huli、zhenjiu-zhiliao | 3 | 18,879 |
| 6 | 影像与功能的对应 | gushang-yingxiang、kangfu-huli | 4 | 11,925 |
| 7 | 评定量表的选择与信效度 | kangfu-huli、huli-yanjiu-zhengxun | 3 | 19,256 |
| 8 | 评定报告与随访 | kangfu-huli、huli-yanjiu-zhengxun | 3 | 51,311 |

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
| **关节与肌力** | **1065** |
| **功能与步态** | **465** |
| **量表与报告** | **3074** |

三辨极差 **6.6×**。三辨 6.6×——「评定」是父课的词根（康复护理正文几乎每段都有），无法通过换词消除；已如实标注，不做假轴。

| 四位面（章群结构分区） | 汉字 |
|---|---:|
| 概论与关节 | 76,704 |
| 平衡步态与ADL | 101,523 |
| 疼痛心理与影像 | 30,804 |
| 量表与报告 | 70,567 |

四位面极差 **3.3×**（结构分区，不用词频）。

## 四、判据

评定不是打分，是给下一个决策提供依据；选错量表比不评更糟。每章要求写清：**适应证与禁忌、操作/适配要点、可核的记录项、随访节点**。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "15-gushang-kangfu-pingding"
node tests/test_chapter_code.js | grep -c "15-gushang-kangfu-pingding"
python scripts/_derive_gs2.py
```

**免责声明：** 本课为教学材料；无独立教材，内容为本库已建课程的**二次编排**。
手法、支具适配与评定须由执业人员执行，不构成诊疗建议。

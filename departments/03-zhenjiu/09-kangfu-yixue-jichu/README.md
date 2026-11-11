# 康复医学基础

**09-kangfu-yixue-jichu** · 针灸推拿学院 · 8 章 · 23 单元 · 375,098 汉字

> 康复不是「养病」，目标是把功能拿回来；评定是起点也是终点

**课程类型：派生课（无独立教材）**。单元正文逐字取自父课，`locator` 一律 `派生·第N章·m.k`，
`source` 记 `父课:父locator`；本课汉字**不与父课相加**。

## 一、父课

- `huli-lunli-fagui`
- `kangfu-huli`
- `laonian-huli`
- `shequ-huli-xue`
- `tuina`

## 二、章表

| # | 章 | 父课来源 | 单元 | 汉字 |
|--:|---|---|--:|--:|
| 1 | 康复医学概论 | kangfu-huli、zhenjiu-zhiliao | 3 | 50,998 |
| 2 | 功能评定 | kangfu-huli、jichu-huli | 3 | 51,270 |
| 3 | 运动功能与训练 | kangfu-huli、tuina | 3 | 21,698 |
| 4 | 日常生活活动与作业治疗 | kangfu-huli、laonian-huli | 3 | 51,161 |
| 5 | 言语、吞咽与认知康复 | kangfu-huli、jichu-huli | 2 | 34,275 |
| 6 | 康复护理与并发症预防 | kangfu-huli、jichu-huli | 3 | 50,861 |
| 7 | 社区与长期照护 | shequ-huli-xue、laonian-huli | 3 | 54,780 |
| 8 | 康复团队与伦理 | kangfu-huli、huli-lunli-fagui | 3 | 60,055 |

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
| **功能评定** | **1049** |
| **治疗技术** | **873** |
| **照护与团队** | **4555** |

三辨极差 **5.2×**。

| 四位面（章群结构分区） | 汉字 |
|---|---:|
| 评定与功能 | 123,966 |
| 生活与言语 | 85,436 |
| 护理与并发症 | 50,861 |
| 社区与团队 | 114,835 |

四位面极差 **2.4×**。这一轴按**章群归属**直接分区，不用词频——
派生课的关键词统计容易被父课的泛词（「患者」「治疗」）支配，结构分区更诚实。

## 四、判据

康复不是「养病」，目标是把功能拿回来；评定是起点也是终点。本课每章要求写清：**适应证边界、操作要点、可核的记录项、禁忌与风险**。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "09-kangfu-yixue-jichu"
node tests/test_chapter_code.js | grep -c "09-kangfu-yixue-jichu"
python scripts/_derive6_zj.py
```

**免责声明：** 本课为教学材料；无独立教材，内容取自本库已建课程，属**二次编排**。
具体操作与剂量须以现行规范与执业人员判断为准，不构成诊疗建议。

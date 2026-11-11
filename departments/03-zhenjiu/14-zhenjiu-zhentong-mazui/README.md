# 针灸镇痛与麻醉

**14-zhenjiu-zhentong-mazui** · 针灸推拿学院 · 8 章 · 37 单元 · 81,773 汉字

> 镇痛机制与电针参数是两条腿；麻醉是辅助不是替代

**课程类型：派生课（无独立教材）**。单元正文逐字取自父课，`locator` 一律 `派生·第N章·m.k`，
`source` 记 `父课:父locator`；本课汉字**不与父课相加**。

## 一、父课

- `cifa-jiufa`
- `kangfu-huli`
- `shiyan-zhenjiu`
- `zhenjiu-xue`
- `zhenjiu-zhiliao`

## 二、章表

| # | 章 | 父课来源 | 单元 | 汉字 |
|--:|---|---|--:|--:|
| 1 | 疼痛生理与评估 | shiyan-zhenjiu、zhenjiu-zhiliao | 5 | 11,925 |
| 2 | 针刺镇痛机制 | shiyan-zhenjiu、zhenjiu-xue | 4 | 11,757 |
| 3 | 电针参数与量效 | cifa-jiufa、shiyan-zhenjiu | 5 | 9,949 |
| 4 | 急性痛与术后镇痛 | zhenjiu-zhiliao、shiyan-zhenjiu | 5 | 2,883 |
| 5 | 慢性痛 | zhenjiu-zhiliao、zhenjiu-xue | 6 | 3,315 |
| 6 | 针刺辅助麻醉 | cifa-jiufa、shiyan-zhenjiu | 4 | 11,639 |
| 7 | 围手术期应用 | zhenjiu-zhiliao、kangfu-huli | 3 | 18,467 |
| 8 | 安全与证据等级 | shiyan-zhenjiu、zhenjiu-zhiliao | 5 | 11,838 |

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
| **镇痛机制** | **321** |
| **刺激参数** | **479** |
| **临床与安全** | **356** |

三辨极差 **1.5×**。

| 四位面（章群结构分区） | 汉字 |
|---|---:|
| 机制与参数 | 33,631 |
| 疼痛临床 | 6,198 |
| 麻醉与围术期 | 30,106 |
| 安全与证据 | 11,838 |

四位面极差 **5.4×**。这一轴按**章群归属**直接分区，不用词频——
派生课的关键词统计容易被父课的泛词（「患者」「治疗」）支配，结构分区更诚实。

## 四、判据

镇痛机制与电针参数是两条腿；麻醉是辅助不是替代。本课每章要求写清：**适应证边界、操作要点、可核的记录项、禁忌与风险**。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "14-zhenjiu-zhentong-mazui"
node tests/test_chapter_code.js | grep -c "14-zhenjiu-zhentong-mazui"
python scripts/_derive6_zj.py
```

**免责声明：** 本课为教学材料；无独立教材，内容取自本库已建课程，属**二次编排**。
具体操作与剂量须以现行规范与执业人员判断为准，不构成诊疗建议。

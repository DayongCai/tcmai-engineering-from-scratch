# 耳穴诊治学

**12-erxue-zhenduan-xue** · 针灸推拿学院 · 8 章 · 40 单元 · 58,090 汉字

> 定位是地基，诊断靠望压电三法，治疗靠刺激量分级

**课程类型：派生课（无独立教材）**。单元正文逐字取自父课，`locator` 一律 `派生·第N章·m.k`，
`source` 记 `父课:父locator`；本课汉字**不与父课相加**。

## 一、父课

- `cifa-jiufa`
- `jingluo`
- `shuxue`
- `zhenjiu-xue`
- `zhenjiu-zhiliao`

## 二、章表

| # | 章 | 父课来源 | 单元 | 汉字 |
|--:|---|---|--:|--:|
| 1 | 耳穴诊治的源流与理论 | zhenjiu-xue、jingluo | 5 | 9,015 |
| 2 | 耳廓解剖与分区 | zhenjiu-xue、shuxue | 5 | 9,563 |
| 3 | 耳穴定位 | zhenjiu-xue、cifa-jiufa | 5 | 11,270 |
| 4 | 耳穴诊断 | zhenjiu-xue、zhenjiu-zhiliao | 5 | 7,208 |
| 5 | 耳穴治疗方法 | cifa-jiufa、zhenjiu-xue | 5 | 8,637 |
| 6 | 耳穴在内科的应用 | zhenjiu-zhiliao、zhenjiu-xue | 5 | 3,177 |
| 7 | 耳穴在妇儿与五官的应用 | zhenjiu-zhiliao、zhenjiu-xue | 5 | 2,636 |
| 8 | 耳穴操作安全与规范 | cifa-jiufa、zhenjiu-xue | 5 | 6,584 |

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
| **定位与解剖** | **335** |
| **诊断方法** | **99** |
| **治疗应用** | **122** |

三辨极差 **3.4×**。

| 四位面（章群结构分区） | 汉字 |
|---|---:|
| 理论与解剖 | 29,848 |
| 诊断 | 7,208 |
| 治疗与病证 | 14,450 |
| 安全规范 | 6,584 |

四位面极差 **4.5×**。这一轴按**章群归属**直接分区，不用词频——
派生课的关键词统计容易被父课的泛词（「患者」「治疗」）支配，结构分区更诚实。

## 四、判据

定位是地基，诊断靠望压电三法，治疗靠刺激量分级。本课每章要求写清：**适应证边界、操作要点、可核的记录项、禁忌与风险**。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "12-erxue-zhenduan-xue"
node tests/test_chapter_code.js | grep -c "12-erxue-zhenduan-xue"
python scripts/_derive6_zj.py
```

**免责声明：** 本课为教学材料；无独立教材，内容取自本库已建课程，属**二次编排**。
具体操作与剂量须以现行规范与执业人员判断为准，不构成诊疗建议。

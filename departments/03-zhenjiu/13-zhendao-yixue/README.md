# 针刀医学

**13-zhendao-yixue** · 针灸推拿学院 · 8 章 · 39 单元 · 74,739 汉字

> 针与刀合一，风险也合一：刀口方向、深度、禁忌是第一纪律

**课程类型：派生课（无独立教材）**。单元正文逐字取自父课，`locator` 一律 `派生·第N章·m.k`，
`source` 记 `父课:父locator`；本课汉字**不与父课相加**。

## 一、父课

- `cifa-jiufa`
- `gubing`
- `shiyan-zhenjiu`
- `tuina`
- `zhenjiu-xue`
- `zhenjiu-zhiliao`

## 二、章表

| # | 章 | 父课来源 | 单元 | 汉字 |
|--:|---|---|--:|--:|
| 1 | 针刀医学概论 | cifa-jiufa、zhenjiu-zhiliao | 5 | 7,038 |
| 2 | 器械、进针与操作规范 | cifa-jiufa、shuxue | 5 | 11,174 |
| 3 | 软组织解剖与病理 | zhenjiu-zhiliao、tuina | 5 | 11,262 |
| 4 | 颈肩腰腿痛 | zhenjiu-zhiliao、zhiliao | 5 | 3,236 |
| 5 | 关节与腱鞘疾病 | zhenjiu-zhiliao、gubing | 5 | 10,986 |
| 6 | 神经卡压 | zhenjiu-zhiliao、zhenjiu-xue | 5 | 11,230 |
| 7 | 安全性：禁忌与并发症 | cifa-jiufa、zhenjiu-zhiliao | 5 | 7,831 |
| 8 | 疗效评价与循证 | shiyan-zhenjiu、zhenjiu-zhiliao | 4 | 11,982 |

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
| **器械与操作** | **493** |
| **病理与解剖** | **397** |
| **病证与安全** | **1259** |

三辨极差 **3.2×**。

| 四位面（章群结构分区） | 汉字 |
|---|---:|
| 概论与器械 | 18,212 |
| 病理与解剖 | 11,262 |
| 病证 | 25,452 |
| 安全与证据 | 19,813 |

四位面极差 **2.3×**。这一轴按**章群归属**直接分区，不用词频——
派生课的关键词统计容易被父课的泛词（「患者」「治疗」）支配，结构分区更诚实。

## 四、判据

针与刀合一，风险也合一：刀口方向、深度、禁忌是第一纪律。本课每章要求写清：**适应证边界、操作要点、可核的记录项、禁忌与风险**。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "13-zhendao-yixue"
node tests/test_chapter_code.js | grep -c "13-zhendao-yixue"
python scripts/_derive6_zj.py
```

**免责声明：** 本课为教学材料；无独立教材，内容取自本库已建课程，属**二次编排**。
具体操作与剂量须以现行规范与执业人员判断为准，不构成诊疗建议。

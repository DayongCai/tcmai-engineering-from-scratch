# 中医康复学

**15-zhongyi-kangfu-xue** · 针灸推拿学院 · 10 章 · 44 单元 · 180,710 汉字

> 辨证与功能两套坐标同时记；中医技术要跟功能目标走

**课程类型：派生课（无独立教材）**。单元正文逐字取自父课，`locator` 一律 `派生·第N章·m.k`，
`source` 记 `父课:父locator`；本课汉字**不与父课相加**。

## 一、父课

- `cifa-jiufa`
- `kangfu-huli`
- `linchuang-zhongyao`
- `qigong`
- `shequ-huli-xue`
- `zhenjiu-zhiliao`
- `zhiliao`
- `zhongyi-xinli-xue`
- `zhongyi-yangsheng-xue`

## 二、章表

| # | 章 | 父课来源 | 单元 | 汉字 |
|--:|---|---|--:|--:|
| 1 | 中医康复学概论 | zhenjiu-zhiliao、zhongyi-yangsheng-xue | 5 | 7,771 |
| 2 | 辨证与功能评定 | zhenjiu-zhiliao、kangfu-huli | 3 | 50,812 |
| 3 | 中药康复 | linchuang-zhongyao、zhongyao-xue | 3 | 15,386 |
| 4 | 针灸康复 | zhenjiu-zhiliao、cifa-jiufa | 6 | 10,810 |
| 5 | 推拿康复 | zhiliao、shoufa | 4 | 10,270 |
| 6 | 气功导引康复 | qigong | 4 | 11,837 |
| 7 | 饮食与情志康复 | zhongyi-yangsheng-xue、zhongyi-xinli-xue | 5 | 11,507 |
| 8 | 中风康复 | zhenjiu-zhiliao、kangfu-huli | 6 | 2,493 |
| 9 | 骨伤与慢病康复 | zhenjiu-zhiliao、kangfu-huli | 5 | 2,106 |
| 10 | 社区与家庭康复 | shequ-huli-xue、zhongyi-huli-jishu | 3 | 57,718 |

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
| **中医技术** | **410** |
| **康复评定** | **924** |
| **调护与养生** | **507** |

三辨极差 **2.3×**。

| 四位面（章群结构分区） | 汉字 |
|---|---:|
| 概论与评定 | 58,583 |
| 中药与针灸 | 26,196 |
| 推拿气功与调护 | 33,614 |
| 病种与社区 | 62,317 |

四位面极差 **2.4×**。这一轴按**章群归属**直接分区，不用词频——
派生课的关键词统计容易被父课的泛词（「患者」「治疗」）支配，结构分区更诚实。

## 四、判据

辨证与功能两套坐标同时记；中医技术要跟功能目标走。本课每章要求写清：**适应证边界、操作要点、可核的记录项、禁忌与风险**。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "15-zhongyi-kangfu-xue"
node tests/test_chapter_code.js | grep -c "15-zhongyi-kangfu-xue"
python scripts/_derive6_zj.py
```

**免责声明：** 本课为教学材料；无独立教材，内容取自本库已建课程，属**二次编排**。
具体操作与剂量须以现行规范与执业人员判断为准，不构成诊疗建议。

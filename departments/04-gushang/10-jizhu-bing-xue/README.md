# 脊柱病学

**10-jizhu-bing-xue** · 骨伤学院 · 10 章 · 45 单元 · 154,370 汉字

> 脊柱的判据是稳定性：先看序列与神经，再谈手法与康复

**课程类型：派生课（无独立教材）**。单元正文逐字取自父课，`locator` 一律 `派生·第N章·m.k`，
`source` 记 `父课:父locator`；本课汉字**不与父课相加**。

## 一、父课

- `gushang-bing`
- `gushang-jichu`
- `gushang-yingxiang`
- `kangfu-huli`
- `shoufa`
- `zhenggu`
- `zhiliao`

## 二、章表

| # | 章 | 父课来源 | 单元 | 汉字 |
|--:|---|---|--:|--:|
| 1 | 脊柱解剖与生物力学 | zhenggu、gushang-jichu | 6 | 11,988 |
| 2 | 脊柱影像诊断 | gushang-yingxiang、gushang-jichu | 6 | 10,448 |
| 3 | 颈椎病 | zhenggu、zhiliao | 4 | 11,585 |
| 4 | 颈椎损伤 | gushang-yingxiang、zhenggu | 4 | 11,397 |
| 5 | 腰椎间盘突出症 | zhenggu、zhiliao | 5 | 11,655 |
| 6 | 腰椎管狭窄与滑脱 | zhenggu、gushang-yingxiang | 4 | 11,922 |
| 7 | 脊柱侧弯与畸形 | zhenggu、gushang-bing | 4 | 10,965 |
| 8 | 骨质疏松性椎体骨折 | gushang-bing、zhenggu | 4 | 11,232 |
| 9 | 手法与手术的边界 | zhenggu、shoufa | 5 | 11,709 |
| 10 | 脊柱康复与长期管理 | kangfu-huli、zhenggu | 3 | 51,469 |

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
| **解剖与力学** | **1105** |
| **诊断与影像** | **634** |
| **治疗与康复** | **874** |

三辨极差 **1.7×**。

| 四位面（章群结构分区） | 汉字 |
|---|---:|
| 基础与影像 | 22,436 |
| 颈椎 | 22,982 |
| 腰椎 | 23,577 |
| 畸形骨折与康复 | 85,375 |

四位面极差 **3.8×**。派生课一律用结构分区：父课的泛词（「治疗」「患者」「手法」）会把关键词轴压成假平衡。

## 四、判据

脊柱的判据是稳定性：先看序列与神经，再谈手法与康复。每章要求写清：**部位与病程、必须排除的危险诊断、处理顺序、可核的随访指标**。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "10-jizhu-bing-xue"
node tests/test_chapter_code.js | grep -c "10-jizhu-bing-xue"
python scripts/_derive_gs.py
```

**免责声明：** 本课为教学材料；无独立教材，内容为本库已建课程的**二次编排**。
具体操作、剂量与手术指征须由执业人员判断，不构成诊疗建议。

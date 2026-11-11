# 运动医学与损伤防护

**05-yundong-yixue** · 骨伤学院 · 8 章 · 32 单元 · 247,244 汉字

> 运动医学的判据是「何时能回到运动」：不是不疼，而是功能达标。

**课程类型：派生课（无独立教材）**。单元正文逐字取自父课，`locator` 一律 `派生·第N章·m.k`；
本课汉字**不与父课相加**。

## 一、父课

- `gushang-jinshang`
- `gushang-jizhu-bing`
- `gushang-kangfu-pingding`
- `gushang-yingxiang`
- `kangfu-huli`
- `zhenggu`
- `zhongyi-yundong`

## 二、章表

| # | 章 | 父课来源 | 单元 | 汉字 |
|--:|---|---|--:|--:|
| 1 | 运动医学概论 | zhongyi-yundong、kangfu-huli | 3 | 51,854 |
| 2 | 运动损伤的机制与分类 | gushang-jinshang、zhenggu | 6 | 11,650 |
| 3 | 损伤评估与影像 | gushang-kangfu-pingding、gushang-yingxiang | 3 | 21,746 |
| 4 | 急性损伤处理与康复分期 | gushang-jinshang、kangfu-huli | 3 | 35,950 |
| 5 | 上肢与下肢常见损伤 | zhenggu、gushang-jinshang | 5 | 11,833 |
| 6 | 躯干损伤与过用性损伤 | gushang-jinshang、gushang-jizhu-bing | 6 | 11,955 |
| 7 | 运动防护与体能训练 | zhongyi-yundong、kangfu-huli | 3 | 51,578 |
| 8 | 重返运动与复发预防 | gushang-kangfu-pingding、kangfu-huli | 3 | 50,678 |

**第 1、7、8 章各 5 万字**（概论、防护训练、重返运动），第 2、5、6 章各 1.1–1.2 万字。
原因是父课（康复护理、运动学）在「训练与重返」上写得最厚，而部位损伤分散在筋伤与正骨的多章里。如实记录。

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
| **损伤识别** | **488** |
| **处理与康复** | **2351** |
| **评定与重返** | **963** |

三辨极差 **4.8×**——「处理与康复」高达 2351，因为父课（康复护理）以干预为主线写；
「损伤识别」只有 488，是这门课的真实短板：**教材讲怎么练，讲怎么认伤少**。这个偏斜没有通过换词消除。

| 四位面（章群结构分区） | 汉字 |
|---|---:|
| 概论与机制 | 63,504 |
| 评估与处理 | 57,696 |
| 部位损伤 | 23,788 |
| 防护与重返 | 102,256 |

四位面极差 **4.3×**。

## 四、这门课的三个判据

1. **先排危险**：任何运动损伤先排除骨折、脱位、神经血管损伤，再谈软组织；
2. **分期处理**：急性期目标是控制出血与肿胀，不是「练回来」；
3. **重返要写数值**：重返运动的标准不能是「感觉好了」，须落到可测指标（活动度、肌力、平衡、专项动作）。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "05-yundong-yixue"
node tests/test_chapter_code.js | grep -c "05-yundong-yixue"
python scripts/_derive_yundongyixue.py
```

**免责声明：** 本课为教学材料。损伤诊断与重返决策须由执业医师与康复治疗师共同判断；
教材未给的量化阈值本课一律标「父课未给」，不代填。

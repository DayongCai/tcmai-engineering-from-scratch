# 中医筋伤学

**07-zhongyi-jinshang-xue** · 骨伤学院 · 10 章 · 47 单元 · 153,979 汉字

> 筋伤不是「软组织损伤」的同义词：按筋、肉、骨分层，按病理分期选手法

**课程类型：派生课（无独立教材）**。单元正文逐字取自父课，`locator` 一律 `派生·第N章·m.k`，
`source` 记 `父课:父locator`；本课汉字**不与父课相加**。

## 一、父课

- `gushang-jichu`
- `kangfu-huli`
- `shoufa`
- `tuina`
- `zhenggu`
- `zhiliao`

## 二、章表

| # | 章 | 父课来源 | 单元 | 汉字 |
|--:|---|---|--:|--:|
| 1 | 筋伤总论 | zhenggu、gushang-jichu | 6 | 11,101 |
| 2 | 筋伤的病理与分期 | zhenggu、gushang-jichu | 5 | 11,607 |
| 3 | 筋伤的诊查 | zhenggu、gushang-jichu | 5 | 11,608 |
| 4 | 理筋手法与固定 | shoufa、zhenggu | 6 | 11,620 |
| 5 | 颈部筋伤 | zhenggu、tuina | 4 | 11,405 |
| 6 | 肩部筋伤 | zhenggu、zhiliao | 4 | 11,187 |
| 7 | 腰背部筋伤 | zhenggu、zhiliao | 5 | 10,879 |
| 8 | 膝、踝部筋伤 | zhenggu、gushang-jichu | 5 | 11,879 |
| 9 | 其他部位筋伤 | zhenggu、shoufa | 4 | 11,862 |
| 10 | 筋伤的康复与预防 | kangfu-huli、zhenggu | 3 | 50,831 |

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
| **筋伤病理** | **337** |
| **手法治疗** | **680** |
| **分期与康复** | **953** |

三辨极差 **2.8×**。

| 四位面（章群结构分区） | 汉字 |
|---|---:|
| 总论与诊查 | 22,708 |
| 病理与手法 | 34,633 |
| 颈肩腰膝 | 33,945 |
| 其他与康复 | 62,693 |

四位面极差 **2.8×**。派生课一律用结构分区：父课的泛词（「治疗」「患者」「手法」）会把关键词轴压成假平衡。

## 四、判据

筋伤不是「软组织损伤」的同义词：按筋、肉、骨分层，按病理分期选手法。每章要求写清：**部位与病程、必须排除的危险诊断、处理顺序、可核的随访指标**。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "07-zhongyi-jinshang-xue"
node tests/test_chapter_code.js | grep -c "07-zhongyi-jinshang-xue"
python scripts/_derive_gs.py
```

**免责声明：** 本课为教学材料；无独立教材，内容为本库已建课程的**二次编排**。
具体操作、剂量与手术指征须由执业人员判断，不构成诊疗建议。

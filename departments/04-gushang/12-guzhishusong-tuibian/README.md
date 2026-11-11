# 骨质疏松与退行性疾病

**12-guzhishusong-tuibian** · 骨伤学院 · 8 章 · 33 单元 · 181,406 汉字

> 骨密度是数、不是结论；防跌倒比补钙更快见效

**课程类型：派生课（无独立教材）**。单元正文逐字取自父课，`locator` 一律 `派生·第N章·m.k`，
`source` 记 `父课:父locator`；本课汉字**不与父课相加**。

## 一、父课

- `gushang-bing`
- `gushang-yingxiang`
- `kangfu-huli`
- `laonian-huli`
- `linchuang-zhongyao`
- `zhenggu`
- `zhongyao-xue`

## 二、章表

| # | 章 | 父课来源 | 单元 | 汉字 |
|--:|---|---|--:|--:|
| 1 | 骨代谢基础 | gushang-bing、zhongyao-xue | 6 | 11,673 |
| 2 | 诊断与骨折风险评估 | gushang-bing、kangfu-huli | 3 | 21,294 |
| 3 | 骨质疏松症 | gushang-bing、zhenggu | 3 | 11,513 |
| 4 | 骨关节炎 | gushang-bing、zhenggu | 4 | 10,578 |
| 5 | 退行性变的影像评估 | gushang-yingxiang、gushang-bing | 5 | 11,702 |
| 6 | 药物与非药物治疗 | gushang-bing、linchuang-zhongyao | 6 | 11,837 |
| 7 | 运动康复与跌倒预防 | kangfu-huli、laonian-huli | 3 | 51,365 |
| 8 | 长期管理与随访 | kangfu-huli、laonian-huli | 3 | 51,444 |

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
| **骨代谢** | **250** |
| **诊断与评估** | **785** |
| **治疗与管理** | **740** |

三辨极差 **3.1×**。

| 四位面（章群结构分区） | 汉字 |
|---|---:|
| 基础与诊断 | 32,967 |
| 骨质疏松与退变 | 22,091 |
| 影像与药物 | 23,539 |
| 康复与长期管理 | 102,809 |

四位面极差 **4.7×**。派生课一律用结构分区：父课的泛词（「治疗」「患者」「手法」）会把关键词轴压成假平衡。

## 四、判据

骨密度是数、不是结论；防跌倒比补钙更快见效。每章要求写清：**部位与病程、必须排除的危险诊断、处理顺序、可核的随访指标**。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "12-guzhishusong-tuibian"
node tests/test_chapter_code.js | grep -c "12-guzhishusong-tuibian"
python scripts/_derive_gs.py
```

**免责声明：** 本课为教学材料；无独立教材，内容为本库已建课程的**二次编排**。
具体操作、剂量与手术指征须由执业人员判断，不构成诊疗建议。

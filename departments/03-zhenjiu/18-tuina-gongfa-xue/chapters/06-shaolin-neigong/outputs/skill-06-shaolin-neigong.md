---
name: shaolin-neigong
description: 用《推拿功法学》第 6 章「少林内功」的单元层做可核对的教学材料。
version: 1.0.0
---

# 少林内功

## 何时用

需要把本章功法变成可核对产物时（三调拆解、练功处方、进度记录、复算）。

## 输入

- 单元层：`standards/gongfa/units.json`（56 单元）
- 五层对账：`standards/gongfa/五层对账.json`（功力供给 vs 手法需求）
- 代码：`departments/03-zhenjiu/18-tuina-gongfa-xue/chapters/06-shaolin-neigong/code/main.js`

## 步骤

1. 跑 `node code/main.js`，记下单元数、汉字数、三辨与体系重心、数值命中；
2. 做拆解表时三调必须分开写，缺一调即标「教材未述」；
3. 练功处方按人群分档，教材没给的分档标「教材未给」；
4. 交付附复算命令。

## 边界

- 调心（意守、入静）不可量化，只能抄原话与体感描述；
- 数值命中少是写法问题，不是剂量松；
- 有基础疾病者：本技能不给强度指引。

**免责声明：** 教学材料，不构成诊疗建议。

---
name: chengfen-yingxiang
description: 用《中药炮制学》第 8 章「炮制对成分与药效的影响」的单元层做可核对的教学材料。
version: 1.0.0
---

# 炮制对成分与药效的影响

## 何时用

需要把本章的成分结构、性质与方法变成可核对产物时（分离流程、方法学清单、结构推断、复算）。

## 输入

- 单元层：`standards/zhongyao-paozhi/units.json`（48 单元；取数见 `chapter-map.json`）
- 代码：`departments/02-zhongyao/08-zhongyao-paozhi-xue/chapters/08-chengfen-yingxiang/code/main.js`

## 步骤

1. 跑 `node code/main.js`，记下单元数、汉字数、三辨与生源重心、数值命中；
2. 分离流程每步都要有判据，没有判据的步骤标「教材未给」；
3. 方法学按七项列表，缺项写「未做」，不写「已做」；
4. 交付附复算命令。

## 边界

- 横切章（总论/方法/药效/测定/网络）的生源词频不作类别判断；
- 数值命中少是写法问题，不是不量化；
- 有机溶剂与高压设备：本技能不给实验操作指引。

**免责声明：** 教学材料，不构成用药或实验建议。

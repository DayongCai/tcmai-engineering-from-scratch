---
name: shenxi-wuguan
description: 用《小儿推拿学》第 9 章「肾系与五官病证」的单元层做可核对的教学材料。
version: 1.0.0
---

# 肾系与五官病证

## 何时用

需要把本章的小儿特定穴与剂量变成可核对产物时（特定穴卡、剂量表、终止条件、复算）。

## 输入

- 单元层：`standards/xiaoer-tuina/units.json`（54 单元）
- 第四层对账：`standards/xiaoer-tuina/四层对账.json`（小儿 vs 成人同名病证）
- 代码：`departments/03-zhenjiu/20-xiaoer-tuina-xue/chapters/09-shenxi-wuguan/code/main.js`

## 步骤

1. 跑 `node code/main.js`，记下单元数、汉字数、三辨与脏腑重心、数值命中；
2. 做特定穴卡时标清「线状/面状/点状」，方向与次数都要有；
3. 剂量按年龄分档，教材没给的分档标「教材未给」；
4. 交付附复算命令。

## 边界

- 「以耐受为度」不可数，只能抄原话；
- 成人经穴与小儿特定穴**同名不同义**，不可互换；
- 新生儿、急症：本技能不给自行操作指引。

**免责声明：** 教学材料，不构成诊疗建议。

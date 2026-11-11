---
name: fenlei-yaoqiu
description: 用《推拿手法学》第 1 章「手法的分类与基本要求」的单元层做可核对的教学材料。
version: 1.0.0
---

# 手法的分类与基本要求

## 何时用

需要把本章手法变成可核对产物时（参数卡、评分表、跨教材差异记录、复算）。

## 输入

- 单元层：`standards/shoufa/units.json`（44 单元；取数见 `standards/shoufa/chapter-map.json`）
- 交叉校验：`standards/shoufa/交叉校验.json`（与《推拿学》同手法对账）
- 代码：`departments/03-zhenjiu/06-tuina-shoufa-xue/chapters/01-fenlei-yaoqiu/code/main.js`

## 步骤

1. 跑 `node code/main.js`，记下单元数、汉字数、三辨与着力面重心、数值命中；
2. 做参数卡时只填带单位的格子（次/分、分钟、寸、kg）；
3. 跨教材比数：按手法名切段取数，别按单元——单元会串数；
4. 交付附复算命令。

## 边界

- 形容词（持久/有力/均匀/柔和/深透）不可数，不能折成数字；
- 文本不等于功力；参数卡不能替代带教；
- 扳法、拔伸：本技能不给自行操作指引。

**免责声明：** 教学材料，不构成诊疗建议。

---
name: neike-bingzheng
description: 用《推拿治疗学》第 5 章「内科病证推拿治疗」的单元层做可核对的教学材料。
version: 1.0.0
---

# 内科病证推拿治疗

## 何时用

需要把本章病证方案变成可核对产物时（方案卡、排除清单、疗效记录、三书对账复算）。

## 输入

- 单元层：`standards/zhiliao/units.json`（50 单元）；病证库 `standards/zhiliao/病证库.json`
- 三书对账：`standards/zhiliao/三书对账.json`
- 代码：`departments/03-zhenjiu/19-tuina-zhiliao-xue/chapters/05-neike-bingzheng/code/main.js`

## 步骤

1. 跑 `node code/main.js`，记下单元数、汉字数、三辨与部位重心、数值命中；
2. 做方案卡时只填带单位的格子（次、分钟、天、疗程）；
3. 排除清单必须是是/否判断题，不照抄病名清单；
4. 交付附复算命令。

## 边界

- 「适度／适中」不可数，不能折算；
- Jaccard 只比手法集合，不比顺序与剂量；
- 扳法、颈椎旋转、小儿推拿：本技能不给自行操作指引。

**免责声明：** 教学材料，不构成诊疗建议。

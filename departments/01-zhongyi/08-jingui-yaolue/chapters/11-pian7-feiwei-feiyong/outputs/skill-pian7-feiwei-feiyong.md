---
name: pian7-feiwei-feiyong
description: 肺痿肺痈咳嗽篇条文核校：15 条 10 方、方条比 0.67、出方条 10
version: 0.1.0
---

# pian7-feiwei-feiyong

## 何时使用

- 要核「肺痿肺痈咳嗽上气病脉证治第七多少条、几方」这类结构说法
- 讲稿把某方说成「本篇主方」，需要看它在 10 方里的位置
- 需要一份字面级的禁忌/死候/自愈清单（表 2）

## 数据来源

`standards/jingui/底本.json` 第 7 篇（外源·笈成）；校勘 `standards/jingui/gushiwen/gushiwen.json` 第 7 篇（外源·古诗文网）。
复算：`node code/main.js`；断言：`node --test code/main.test.js`。

## 口径

- 条号 = 源页「篇.条」，不编不并；附篇 23-25 无条号。
- 方只计有方文者（formulas[]）；仅存方名者单列。
- 表 2 为字面命中，可重叠，不得相加当条数。

## 输出

结论 + 条号级依据 + 实测数值。不得引入通行本数字替换本库实测。

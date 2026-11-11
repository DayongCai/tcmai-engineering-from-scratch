---
name: pian18-chuangyong
description: 疮痈肠痈浸淫篇条文核校：8 条 3 方、方条比 0.38、出方条 3
version: 0.1.0
---

# pian18-chuangyong

## 何时使用

- 要核「疮痈肠痈浸淫病脉证并治第十八多少条、几方」这类结构说法
- 讲稿把某方说成「本篇主方」，需要看它在 3 方里的位置
- 需要一份字面级的禁忌/死候/自愈清单（表 2）

## 数据来源

`standards/jingui/底本.json` 第 18 篇（外源·笈成）；校勘 `standards/jingui/gushiwen/gushiwen.json` 第 18 篇（外源·古诗文网）。
复算：`node code/main.js`；断言：`node --test code/main.test.js`。

## 口径

- 条号 = 源页「篇.条」，不编不并；附篇 23-25 无条号。
- 方只计有方文者（formulas[]）；仅存方名者单列。
- 表 2 为字面命中，可重叠，不得相加当条数。

## 输出

结论 + 条号级依据 + 实测数值。不得引入通行本数字替换本库实测。

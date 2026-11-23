#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 21 章 换一种坐标表示，近邻集合先要稳住
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/21-zhineng-yuyi-zhangliang/docs/zh.md
 * 数据: 本章正文的资产与口径表 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 8 项资产、建议 k=10、查询不少于 20 从正文读出。
 * 用 Jaccard 公式现算单条与两条翻转的示例：k=10 时，1 条互换 → 9/11 = 0.818。
 */

'use strict';

const path = require('node:path');
const { readDoc, tableMap, grab, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '21-zhineng-yuyi-zhangliang';
const NO = 21;
const TITLE = '换一种坐标表示，近邻集合先要稳住';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

const assets = rows.get('semtensor 目录');
const k = grab(doc, /\|\s*k\s*\|[^|]*\|\s*建议\s*(\d+)/, 'k 建议值');
const minQueries = grab(doc, /查询条数\s*\|[^|]*\|\s*建议不少于\s*(\d+)/, '查询下限');
const jaccard = (same) => same / (2 * k - same);
const oneSwap = jaccard(k - 1);
const twoSwap = jaccard(k - 2);
if (assets !== 8) throw new Error('资产项数读取失败');
if (k !== 10) throw new Error('k 建议值应为 10');
if (Math.abs(oneSwap - 0.818) > 0.001) throw new Error('单条翻转 Jaccard 复算不一致');

banner(NO, TITLE);
console.log(`资产 ${assets} 项 · 建议 k=${k} · 查询不少于 ${minQueries} 条 · 模型 bge-small-zh（版本须锁定）`);
console.log(`Jaccard = 交集 ÷ 并集；k=${k} 时，1 条邻居互换 → 9 ÷ 11 = ${oneSwap.toFixed(3)}（正文约 0.818）`);
console.log(`2 条邻居互换 → 8 ÷ 12 = ${twoSwap.toFixed(3)}；翻转越多，Jaccard 下降越快`);
console.log(`翻转要分层：前 5 名、5–10 名、10 名以后；前 5 名翻转最要命，直接影响用户看到的结果。`);
console.log(`判断：同类来自等价关系，不来自相似度；结论只对本批查询与这个 k 成立。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));

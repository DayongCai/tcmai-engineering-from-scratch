#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 13 章 缺项填零，量表就成了假分数
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/13-gushang-kangfu-pingding/docs/zh.md
 * 数据: 本章正文的四件与三条门禁 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 包结构四件、门禁三条从正文读出；「十项缺三项」的算例由本脚本现算：
 * 可评率 7 ÷ 10 = 70%，低于教学示例阈值 80%，因此不出总分，只报「不可评」。
 */

'use strict';

const path = require('node:path');
const { readDoc, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '13-gushang-kangfu-pingding';
const NO = 13;
const TITLE = '缺项填零，量表就成了假分数';
const doc = readDoc(SLUG).text;

const PACKAGE = ['数据', '脚本', '门禁', 'README'];
const GATES = ['字段完整性', '分数范围', '缺项显式化'];
const THRESHOLD = 0.8; // 教学示例阈值，README 须注明可按机构制度调整

/** 缺项显式化：不适用与缺项分开，缺项不填 0；低于阈值不出总分 */
function scoreOf(items, threshold = THRESHOLD) {
  const applicable = items.filter((x) => x.applicable !== false);
  const rated = applicable.filter((x) => x.missing !== true);
  const rate = applicable.length ? rated.length / applicable.length : 0;
  if (rate < threshold) return { total: null, rate, evaluable: false };
  return { total: rated.reduce((a, x) => a + x.score, 0), rate, evaluable: true };
}

const sample = [
  { score: 2 }, { score: 1 }, { score: 3 }, { score: 0 }, { score: 2 },
  { score: 1 }, { score: 3 }, { missing: true }, { missing: true }, { missing: true },
];
const result = scoreOf(sample);
if (PACKAGE.length !== 4 || GATES.length !== 3) throw new Error('包结构或门禁条数读取失败');
if (result.evaluable) throw new Error('十项缺三项不应出总分');

banner(NO, TITLE);
console.log(`包结构 ${PACKAGE.length} 件：${PACKAGE.join('／')}`);
console.log(`门禁 ${GATES.length} 条：${GATES.join('／')}（缺项显式化是核心）`);
console.log(`算例：10 项中缺 3 项 → 可评率 ${result.rate * 100}% ＜ 阈值 ${THRESHOLD * 100}%，不出总分，只报「不可评」`);
console.log(`若把缺项填 0：总分 = ${sample.reduce((a, x) => a + (x.score || 0), 0)}，看起来正常，实际不可比。`);
console.log(`判断：门禁要能被故意改坏一次并报警；信度系数在量表未建前不可报。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));

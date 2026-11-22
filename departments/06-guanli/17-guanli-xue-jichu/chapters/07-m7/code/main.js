#!/usr/bin/env node
/**
 * 管理学基础 · 第 7 章 组织图上的每一根线，都要有人能被叫来问
 * 课程: departments/06-guanli/17-guanli-xue-jichu/chapters/07-m7/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 两件可算的事，参数全部取自正文：
 *   一、格兰丘纳斯关系数：直接关系 + 交叉关系 + 组合关系，用来证明「多加几个人」不是线性成本；
 *   二、幅度与层级：给定科室数与幅度，推出最少层级，说明层级是被幅度逼出来的结果。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 7;
const TITLE = '组织图上的每一根线，都要有人能被叫来问';

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function grab(text, re, label) {
  const m = text.match(re);
  if (!m) throw new Error('正文里找不到「' + label + '」，章节是否已被改写？');
  const n = Number(String(m[1]).replace(/,/g, ''));
  if (!Number.isFinite(n)) throw new Error('「' + label + '」取到的不是数: ' + m[1]);
  return n;
}

/** 正文第 5 行的机构画像与第 15–16 行的关系数示例。 */
function facts(text) {
  return {
    leaders: grab(text, /有\s*(\d+)\s*名院领导/, '8 名院领导'),
    clinicalDepts: grab(text, /(\d+)\s*个临床科室/, '31 个临床科室'),
    functionalDepts: grab(text, /(\d+)\s*个职能科室/, '14 个职能科室'),
    span: grab(text, /分管\s*(\d+)\s*个科室/, '分管 11 个科室'),
    signatures: grab(text, /一份采购文件要过\s*(\d+)\s*个签字/, '7 个签字'),
    directives: grab(text, /每周向病区直接下达\s*(\d+)\s*条以上/, '3 条指令'),
    relFour: grab(text, /n = 4 时，关系总数 = [\d +]+= \*\*([\d,]+)\*\*/, 'n=4 得 44'),
    relEight: grab(text, /n = 8 时，关系总数 = [\d, +]+= \*\*([\d,]+)\*\*/, 'n=8 得 1,080'),
  };
}

/** 格兰丘纳斯：直接 n + 交叉 n(n−1) + 组合 n(2^(n−1)−1)。 */
function relations(n) {
  if (!(Number.isInteger(n) && n > 0)) throw new Error('下属人数必须是正整数');
  return n + n * (n - 1) + n * (Math.pow(2, n - 1) - 1);
}

/** 关系数随幅度增长的速度：n 翻一倍涨多少倍。 */
function growthRatio(a, b) {
  return relations(b) / relations(a);
}

/** 给定单元数与幅度，最少需要几层（顶层由管理者本人承担）。 */
function layers(units, span) {
  if (!(units > 0) || !(span > 1)) throw new Error('单元数与幅度必须为正，幅度需大于 1');
  return Math.ceil(Math.log(units) / Math.log(span)) || 1;
}

function main() {
  const text = read();
  const f = facts(text);
  const totalUnits = f.clinicalDepts + f.functionalDepts;
  const ratio = growthRatio(4, 8);
  const need = layers(totalUnits, f.span);

  console.log(`管理学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log(`一、机构画像：${f.leaders} 名院领导 · ${f.clinicalDepts} 个临床科室 · ${f.functionalDepts} 个职能科室`);
  console.log(`  一名副院长分管 ${f.span} 个科室；一份采购文件过 ${f.signatures} 个签字；护理部每周直接下达 ${f.directives} 条以上指令`);
  console.log('  → 图上的线有三种含义（指挥、参谋、协调），没区分就只能靠人记；判据是出事时第一个被叫去问的人是谁。');
  console.log('');
  console.log('二、格兰丘纳斯关系数：直接 n + 交叉 n(n−1) + 组合 n(2^(n−1)−1)');
  console.log(`  下属 ${4} 人 → ${relations(4)} 条（正文 ${f.relFour}）`);
  console.log(`  下属 ${8} 人 → ${relations(8)} 条（正文 ${f.relEight}）`);
  console.log(`  人数翻一倍，关系数增至 ${ratio.toFixed(1)} 倍 → 幅度从来不是线性成本。`);
  console.log('');
  console.log(`三、幅度与层级：${totalUnits} 个单元、幅度 ${f.span} → 至少 ${need} 层`);
  console.log('  → 层级是幅度的结果，不是可以自由选择的风格；每多一层，信息衰减一次、审批多一次往返。');
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；44 与 1,080 为公式演算，不代表任何机构应采用该幅度。');
  console.log('※ 本输出仅用于教学演示，不构成管理咨询意见或机构设置方案。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  CHAPTER,
  TITLE,
  read,
  facts,
  relations,
  growthRatio,
  layers,
};

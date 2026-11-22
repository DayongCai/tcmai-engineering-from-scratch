#!/usr/bin/env node
/**
 * 管理学基础 · 第 8 章 变革死在半路，文化活在细节
 * 课程: departments/06-guanli/17-guanli-xue-jichu/chapters/08-m8/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 一次认知断层的漏斗演算：知道要改什么 → 能说出岗位怎么改 → 认为对自己有好处。
 * 三段比例全部取自正文，现算每一层保留了多少、合计衰减到几分之一。
 * 漏斗越窄，越说明「动员」与「落地」之间差的是利益、动作与中间成果，不是热情。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const TITLE = '变革死在半路，文化活在细节';

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

const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

/** 正文第 5 行的断层数字与第 29 行的科特估计。 */
function facts(text) {
  return {
    reforms: CN[text.match(/([一二三四五六七八九十]+)次变革/)[1]],
    knowPct: grab(text, /(\d+)%\s*的员工知道医院要改什么/, '87% 知道'),
    actionPct: grab(text, /(\d+)%\s*能说出自己岗位上具体要改成什么样/, '31% 能说出'),
    benefitPct: grab(text, /(\d+)%\s*认为改了对自己的工作有好处/, '12% 认为有好处'),
    revertMonths: CN[text.match(/都在([一二三四五六七八九十]+)个月后回到原样/)[1]],
    kotterFailShare: CN[text.match(/约([一二三四五六七八九十]+)成变革未达预期/)[1]] * 10,
  };
}

/** 断层的保留比例：后一层 ÷ 前一层。 */
function retention(fromPct, toPct) {
  if (!(fromPct > 0)) throw new Error('前一层比例必须为正');
  return (toPct / fromPct) * 100;
}

/** 累计衰减：最后一层相对第一层剩下多少。 */
function overall(f) {
  return retention(f.knowPct, f.benefitPct);
}

function main() {
  const text = read();
  const f = facts(text);

  console.log(`管理学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log(`一、${f.reforms} 次变革，每次约 ${f.revertMonths} 个月后回到原样`);
  console.log('  → 启动会与培训能覆盖全员，但它们只解决「知道」；回潮发生在「动作」与「利益」两段。');
  console.log('');
  console.log('二、认知断层漏斗：');
  console.log(`  知道要改什么        ${f.knowPct}%`);
  console.log(`  能说出岗位怎么改    ${f.actionPct}%  （保留 ${retention(f.knowPct, f.actionPct).toFixed(1)}%）`);
  console.log(`  认为对自己有好处    ${f.benefitPct}%  （保留 ${retention(f.actionPct, f.benefitPct).toFixed(1)}%）`);
  console.log(`  合计：从知道到愿意，只剩 ${overall(f).toFixed(1)}%`);
  console.log('  → 每一层砍掉约三分之二。动员做完了，方案发了，利益、动作、中间成果一件都没到。');
  console.log('');
  console.log(`三、失败是常态：科特估计约 ${f.kotterFailShare}% 的变革未达预期（经验估计，非严格统计）`);
  console.log('  → 所以设计变革时要把「回退方案」与「中间成果」写进方案，而不是把成败押在动员力度上。');
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；87%、31%、12% 为合成的调查设定，不对应真实机构。');
  console.log('※ 本输出仅用于教学演示，不构成管理咨询意见或改革实施方案。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, facts, retention, overall };

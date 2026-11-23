#!/usr/bin/env node
/**
 * 中医体质学 · 第 4 章 体质与证候：同证异质、同质异证
 * 课程: departments/01-zhongyi/04-zhongyi-tizhi-xue/chapters/04-tizhi-zhenghou/docs/zh.md
 * 数据: chapters/_corpus.js 读 standards/ 下的证候库、体质库与映射表
 * 依赖: 仅 Node.js 标准库
 *
 * 本章只算一件可复算的事：132 个证候里有多少个同时见于两个科、占比多少、
 * 平均多少证里有一个。跨科只说明证名被两科共用，不说明两科病人相同。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { ROOT, analyze: corpusAnalyze } = require(path.join(__dirname, '..', '..', '_corpus.js'));

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '同一个证可以长在不同底子上，处理要分两步走';
const round1 = (x) => Math.round(x * 10) / 10;

function analyze() {
  const base = corpusAnalyze();
  const cross = base.corpus.zheng
    .filter((x) => x.courseCount >= 2)
    .map((x) => ({ name: x.name, courses: x.courses.slice().sort() }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  const share = round1((cross.length / base.total) * 100);
  const oneIn = round1(base.total / cross.length);
  return { ...base, cross, crossShare: share, oneInEvery: oneIn };
}

module.exports = { DOC, TITLE, ROOT, analyze };

if (require.main === module) {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  const a = analyze();
  console.log('═══ 中医体质学 · 第 4 章 ' + TITLE + ' ═══');
  console.log(`跨两科证候 ${a.cross.length} / ${a.total}，占 ${a.crossShare}%；平均 ${a.oneInEvery} 证里有一个。`);
  console.log('\n跨科证候清单（只说明证名被两科共用，不说明病人相同）：');
  for (const x of a.cross) console.log(`  ${x.name}\t${x.courses.join(' / ')}`);
  console.log('\n交接提醒：只写质名会让接手方按本科经验理解；应附最近一次的证、主质与兼夹、变化最大的一域。');
  console.log('※ 教学样例：数字由 standards/zhenghou/证候库.json 现算，不构成诊疗建议，不能替代医师面诊。');
}

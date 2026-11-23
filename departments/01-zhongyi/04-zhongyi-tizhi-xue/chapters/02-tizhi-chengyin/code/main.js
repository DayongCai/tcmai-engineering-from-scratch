#!/usr/bin/env node
/**
 * 中医体质学 · 第 2 章 体质的形成：底板与漂移
 * 课程: departments/01-zhongyi/04-zhongyi-tizhi-xue/chapters/02-tizhi-chengyin/docs/zh.md
 * 数据: chapters/_corpus.js 读 standards/ 下的证候库、体质库与映射表
 * 依赖: 仅 Node.js 标准库
 *
 * 本章只做两件可复算的事：老年常见五质的证候合计与占比，以及各质「覆盖病名 ÷ 证候数」
 * 的扩散度。前者说明分母是证候不是人，后者只作排查兼夹的提示，不读成发病率。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { ROOT, analyze: corpusAnalyze } = require(path.join(__dirname, '..', '..', '_corpus.js'));

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '底板改不了，漂移的方向可以选';
const FIVE = ['气虚质', '阳虚质', '阴虚质', '痰湿质', '血瘀质'];
const round1 = (x) => Math.round(x * 10) / 10;

function analyze() {
  const base = corpusAnalyze();
  const rows = base.rows;
  const pick = (type) => rows.find((r) => r.type === type);
  const five = FIVE.map((type) => {
    const r = pick(type);
    return { type, zhengCount: r.zhengCount, diseaseCount: r.diseaseCount, diffusion: round1(r.diseaseCount / r.zhengCount) };
  });
  const fiveSum = five.reduce((a, r) => a + r.zhengCount, 0);
  const sharePct = Math.round((fiveSum / base.total) * 100);
  const diffusion = {};
  for (const r of rows) if (r.zhengCount > 0) diffusion[r.type] = round1(r.diseaseCount / r.zhengCount);
  return { ...base, five, fiveSum, sharePct, diffusion };
}

module.exports = { DOC, TITLE, ROOT, FIVE, analyze };

if (require.main === module) {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  const a = analyze();
  console.log('═══ 中医体质学 · 第 2 章 ' + TITLE + ' ═══');
  console.log(`证候总数 ${a.total}；老年常见五质合计 ${a.fiveSum} 证，占 ${a.sharePct}%。`);
  console.log('\n五质分项：');
  for (const r of a.five) console.log(`  ${r.type}\t${r.zhengCount} 证\t${r.diseaseCount} 病名\t扩散度 ${r.diffusion.toFixed(1)}`);
  console.log('\n扩散度（覆盖病名 ÷ 证候数，只作兼夹排查提示）：');
  for (const [type, v] of Object.entries(a.diffusion).sort((x, y) => y[1] - x[1])) console.log(`  ${type}\t${v.toFixed(1)}`);
  console.log(`\n分母提醒：${a.sharePct}% 的分母是 ${a.total} 个证候，不是人数；本库不带年龄字段，不能据此推断老年人中的比例。`);
  console.log('※ 教学样例：数字由 standards/zhenghou/证候库.json 现算，不构成诊疗建议，不能替代医师面诊。');
}

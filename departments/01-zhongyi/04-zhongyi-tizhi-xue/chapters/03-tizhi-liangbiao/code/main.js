#!/usr/bin/env node
/**
 * 中医体质学 · 第 3 章 九种体质的判定与量表设计：四域各自计量
 * 课程: departments/01-zhongyi/04-zhongyi-tizhi-xue/chapters/03-tizhi-liangbiao/docs/zh.md
 * 数据: chapters/_corpus.js 读 standards/ 下的证候库、体质库与映射表
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的算术只用于说明量表设计的压力：两质合计占多少、两小质合计占多少，
 * 以及大小质之间差多少证。数值全部由证候库现算，不给条目、不给阈值。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { ROOT, analyze: corpusAnalyze } = require(path.join(__dirname, '..', '..', '_corpus.js'));

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '判定要靠两条同向证据，不能靠一条扎眼的特征';
const BIG = ['湿热质', '阴虚质'];
const SMALL = ['痰湿质', '阳虚质'];
const round1 = (x) => Math.round(x * 10) / 10;

function analyze() {
  const base = corpusAnalyze();
  const pick = (type) => base.rows.find((r) => r.type === type);
  const big = BIG.map(pick).map((r) => ({ type: r.type, zhengCount: r.zhengCount }));
  const small = SMALL.map(pick).map((r) => ({ type: r.type, zhengCount: r.zhengCount }));
  const bigSum = big.reduce((a, r) => a + r.zhengCount, 0);
  const smallSum = small.reduce((a, r) => a + r.zhengCount, 0);
  return {
    ...base,
    big,
    small,
    bigSum,
    smallSum,
    bigShare: round1((bigSum / base.total) * 100),
    smallShare: round1((smallSum / base.total) * 100),
    gap: bigSum - smallSum,
  };
}

module.exports = { DOC, TITLE, ROOT, BIG, SMALL, analyze };

if (require.main === module) {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  const a = analyze();
  console.log('═══ 中医体质学 · 第 3 章 ' + TITLE + ' ═══');
  console.log(`两质合计 ${a.bigSum} 证（${a.big.map((r) => r.type + r.zhengCount).join('、')}），占 ${a.total} 证的 ${a.bigShare}%。`);
  console.log(`两小质合计 ${a.smallSum} 证（${a.small.map((r) => r.type + r.zhengCount).join('、')}），占 ${a.smallShare}%。`);
  console.log(`大小质相差 ${a.gap} 证：条目若一质一题，大质会吸收相关回答，小质几乎没有机会被看见。`);
  console.log('\n九质分项：');
  for (const r of a.rows) console.log(`  ${r.type}\t${r.zhengCount} 证\t${r.diseaseCount} 病名`);
  console.log('※ 教学样例：条目、分档与临界规则均为教学设定；数字由 standards/zhenghou/证候库.json 现算，不构成诊疗建议。');
}

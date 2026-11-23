#!/usr/bin/env node
/**
 * 中医体质学 · 第 5 章 问卷到特征向量：四域各自计量，不可混算
 * 课程: departments/01-zhongyi/04-zhongyi-tizhi-xue/chapters/05-tizhi-tezheng/docs/zh.md
 * 数据: chapters/_corpus.js 读 standards/ 下的证候库、体质库与映射表
 * 依赖: 仅 Node.js 标准库
 *
 * 本章用一组示意分数演示两种算法的分歧：四域均分把信息压成一个数，最高域则直接改变结论。
 * 示意分数与演示支持线只用于课堂演算，不是量表标准；九质 × 四域的格子数由体质库现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { ROOT, analyze: corpusAnalyze } = require(path.join(__dirname, '..', '..', '_corpus.js'));

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '量表算出来的不是一分数，是四组分数';
const DOMAINS = ['形态', '功能', '心理', '易感'];
const DEMO = { 形态: 2, 功能: 4, 心理: 2, 易感: 3 };
/** 正文算例只按三质走关键域；易感 3 分在本例中是佐证，不作特禀质的关键域判定 */
const KEY = { 痰湿质: '形态', 气虚质: '功能', 气郁质: '心理' };
const DEMO_SUPPORT = 3;

function analyze() {
  const base = corpusAnalyze();
  const scores = DOMAINS.map((d) => DEMO[d]);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const max = Math.max(...scores);
  // 体质库里「未归类」是失配桶，不是九质之一，不计入九质 × 四域
  const nine = base.corpus.types.filter((t) => t.type !== '未归类');
  const grid = nine.length * DOMAINS.length;
  const verdicts = Object.entries(KEY).map(([type, domain]) => ({
    type,
    domain,
    score: DEMO[domain],
    pass: DEMO[domain] >= DEMO_SUPPORT,
  }));
  return { ...base, types: nine, scores, mean, max, grid, verdicts, passed: verdicts.filter((v) => v.pass).map((v) => v.type) };
}

module.exports = { DOC, TITLE, ROOT, DOMAINS, DEMO, KEY, DEMO_SUPPORT, analyze };

if (require.main === module) {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  const a = analyze();
  console.log('═══ 中医体质学 · 第 5 章 ' + TITLE + ' ═══');
  console.log(`九质 × 四域 = ${a.grid} 个域内格子；示意分数 ${DOMAINS.map((d) => d + a.scores[DOMAINS.indexOf(d)]).join(' / ')}`);
  console.log(`四域均分 ${a.mean.toFixed(2)}；最高域 ${a.max}。同一份答卷，两种算法给出相反答案。`);
  console.log('\n按关键域优先逐质看（演示支持线 ' + DEMO_SUPPORT + '，非量表标准）：');
  for (const v of a.verdicts) console.log(`  ${v.type}\t关键域 ${v.domain}\t${v.score} 分\t${v.pass ? '支持' : '未达支持线'}`);
  console.log(`结论：主质 ${a.passed.join('、') || '无'}；其余按未达支持线记录。`);
  console.log('※ 教学样例：示例分数与演示支持线均非量表标准，不构成诊疗建议，不能替代医师面诊。');
}

#!/usr/bin/env node
/**
 * 中医体质学 · 第 1 章 体质的概念与九种体质类型
 * 课程: departments/01-zhongyi/04-zhongyi-tizhi-xue/chapters/01-tizhi-gainian/docs/zh.md
 * 数据: chapters/_corpus.js 读 standards/ 下的证候库、体质库与映射表
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：132 个证候按病性族归入九质，逐质统计证候数、去重病名数与跨两科证候数，
 * 再用总条数复算。正文里的 132 / 208 / 82 / 0 都由这里产出，不手打。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { ROOT, analyze } = require(path.join(__dirname, '..', '..', '_corpus.js'));

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '九种体质是九把尺子，量的是倾向不是病名';

module.exports = { DOC, TITLE, ROOT, analyze };

if (require.main === module) {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  const a = analyze();
  console.log('═══ 中医体质学 · 第 1 章 ' + TITLE + ' ═══');
  console.log(`证候 ${a.total} · 病证配对 ${a.pairs} · 去重病名 ${a.diseases} · 跨两科 ${a.crossSum}`);
  console.log('\n按病性族归入九质：');
  for (const r of a.rows) {
    console.log(`  ${r.type}\t${String(r.zhengCount).padStart(3)} 证\t${String(r.diseaseCount).padStart(3)} 病名\t跨科 ${r.cross2}`);
  }
  console.log(`\n复算：证候合计 ${a.rows.reduce((s, r) => s + r.zhengCount, 0)} = ${a.total}；病证配对 ${a.pairs}；各质覆盖病名去重后相加 ${a.coverageSum}，差额 ${a.pairs - a.coverageSum} 次来自同一病名落在多个质。`);
  console.log(`最大一族 ${a.top.type} ${a.top.zhengCount} 证，占 ${a.total} 证的 ${(a.share * 100).toFixed(1)}%；平和质 ${a.pinghe.zhengCount} 证。`);
  console.log('※ 教学样例：数字由 standards/zhenghou/证候库.json 现算，不构成诊疗建议，不能替代医师面诊。');
}

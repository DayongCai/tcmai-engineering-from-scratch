#!/usr/bin/env node
/**
 * 医学遗传学 · 第 9 章 染色体病的表型不是「某个基因坏了」，是「一整批基因的剂量偏了」
 * 课程: departments/09-jichu/09-yixue-yichuan-xue/chapters/09-changjian-ranse-ti-bing/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的算术是核型条数与分离比：46 ± 1 得到 45/47；罗伯逊易位的三价体产生六种配子，
 * 其中一种导致易位型三体（理论比数 1/6），四种不平衡。活产风险还要再乘一个存活系数。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 9;
const TITLE = '染色体病的表型不是「某个基因坏了」，是「一整批基因的剂量偏了」';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const lines = body.split('\n');
  const sections = [];
  let cur = null;
  for (const line of lines) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { cur = { title: h[1], hanzi: 0 }; sections.push(cur); continue; }
    if (cur) cur.hanzi += (line.match(HANZI) || []).length;
  }
  return {
    hanzi: (body.match(HANZI) || []).length,
    sections,
    tables: (body.match(/^\s*\|[\s:|-]+\|\s*$/gm) || []).length,
    claims: (body.match(/\*\*[^*\n]+\*\*/g) || []).length,
  };
}

const DIPLOID = 46;   // 正文：正常二倍体 46 条
const GAMETES = 6;    // 正文：三价体理论产生六种配子

/** 罗伯逊易位：六种配子中 1 正常、1 平衡携带、4 不平衡（其中一种导致易位型三体） */
const segregation = { normal: 1, balanced: 1, unbalanced: 4, trisomyType: 1 };

/** 活产风险 = 理论比数 × 存活概率 */
const liveBorn = (ratio, survival) => ratio * survival;

function figures(text) {
  return [
    { name: '易位型三体的理论比数', got: segregation.trisomyType / GAMETES, stated: 1 / 6, token: '1/6' },
    { name: '不平衡配子的种数', got: segregation.unbalanced, stated: 4, token: '四种不平衡' },
    { name: '三体核型的总条数', got: DIPLOID + 1, stated: 47, token: '47,XXY' },
    { name: '单体核型的总条数', got: DIPLOID - 1, stated: 45, token: '45,X' },
    { name: '六种配子的合计', got: segregation.normal + segregation.balanced + segregation.unbalanced, stated: GAMETES, token: '六种配子' },
  ].map((f) => ({ ...f, ok: Math.abs(f.got - f.stated) <= (f.tol || 0.03) * Math.abs(f.stated) }));
}

function fmt(x) {
  if (x >= 10) return x.toFixed(0);
  if (x >= 1) return x.toFixed(3);
  return x.toPrecision(3);
}

function main() {
  const text = read();
  const a = analyze(text);
  const rows = figures(text);
  const ratio = segregation.trisomyType / GAMETES;

  console.log(`医学遗传学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算：正文写输入，这里重算，再与正文的结果对照）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tables} 张 · 加粗判断 ${a.claims} 处`);
  console.log('');
  for (const r of rows) {
    const mark = r.ok ? '✓' : '✗ 与正文不符';
    console.log(`  ${r.name.padEnd(16, '　')} 算得 ${fmt(r.got).padStart(8)} · 正文 ${r.token}  ${mark}`);
  }
  console.log('');
  console.log('活产风险 = 理论比数 × 存活概率，举例（仅演示算术）：');
  for (const s of [1, 0.5, 0.3, 0.1]) {
    console.log(`  存活概率 ${String(s).padEnd(5)} → 活产风险 ${(liveBorn(ratio, s) * 100).toFixed(1)}%`);
  }
  console.log('读法：理论比数是分离方式给的，活产风险还要乘「能不能活到出生」；跳过这一步会把风险高估数倍。');
  console.log('※ 1/6 为减数分裂分离的理论推导；本章不写任何染色体病的发病率、患病率与期望寿命。');
  console.log('※ 本输出仅用于教学演示，不构成诊断、预后判断或终止妊娠决策的依据。');
  if (rows.some((r) => !r.ok)) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, figures, segregation, liveBorn, GAMETES };

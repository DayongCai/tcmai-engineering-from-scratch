#!/usr/bin/env node
/**
 * 医学遗传学 · 第 7 章 再发风险不是一个数字，是一个随每条新信息改动的后验
 * 课程: departments/09-jichu/09-yixue-yichuan-xue/chapters/07-yiganxing-yu-zaifa-fengxian/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章是一条四步的更新链：1/2 →（40 岁正常）→ 1/11 →（传给子代）→ 4.1% →（检测阴性）→ 1/1000 → 0.045%。
 * 另附阳性预测值一例（1/1000 患病率、99%/99%）。每一步都由正文写下的输入现算，再与正文的结果对照。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 7;
const TITLE = '再发风险不是一个数字，是一个随每条新信息改动的后验';

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

const PEN = 0.9;   // 正文：外显率 90%
const SENS = 0.99; // 正文：预测性检测灵敏度 99%
const SPEC = 0.99; // 正文：特异度 99%
const PREV = 1 / 1000; // 正文：受检人群中占 1/1000

/** 整条链：先验 → 年龄更新 → 子代风险 → 检测更新 → 再折算子代 */
function chain() {
  const prior = 0.5;
  const postAge = (prior * (1 - PEN)) / (prior * (1 - PEN) + (1 - prior) * 1);
  const child1 = postAge * 0.5 * PEN;
  const postTest = (postAge * (1 - SENS)) / (postAge * (1 - SENS) + (1 - postAge) * SPEC);
  const child2 = postTest * 0.5 * PEN;
  return { prior, postAge, child1, postTest, child2 };
}

/** 阳性预测值：真阳性 ÷（真阳性 + 假阳性） */
function ppv(prev, sens, spec) {
  const tp = sens * prev;
  const fp = (1 - spec) * (1 - prev);
  return { tp, fp, value: tp / (tp + fp) };
}

function figures(text) {
  const c = chain();
  const p = ppv(PREV, SENS, SPEC);
  return [
    { name: '40 岁正常后的携带概率', got: c.postAge, stated: 1 / 11, token: '1/11' },
    { name: '子代患病风险', got: c.child1 * 100, stated: 4.1, token: '4.1%' },
    { name: '阴性后的携带概率', got: c.postTest, stated: 1 / 1000, token: '1/1000' },
    { name: '阴性后的子代风险', got: c.child2 * 100, stated: 0.045, token: '0.045%' },
    { name: '阳性预测值', got: p.value * 100, stated: 9, token: '≈ 9%' },
  ].map((f) => ({ ...f, ok: Math.abs(f.got - f.stated) <= 0.03 * Math.abs(f.stated) }));
}

function fmt(x) {
  if (x >= 1) return x.toFixed(2);
  if (x >= 0.01) return x.toFixed(3);
  return x.toPrecision(3);
}

function main() {
  const text = read();
  const a = analyze(text);
  const rows = figures(text);
  const p = ppv(PREV, SENS, SPEC);

  console.log(`医学遗传学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算：正文写输入，这里逐步重算，再与正文的结果对照）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tables} 张 · 加粗判断 ${a.claims} 处`);
  console.log('');
  for (const r of rows) {
    const mark = r.ok ? '✓' : '✗ 与正文不符';
    console.log(`  ${r.name.padEnd(16, '　')} 算得 ${fmt(r.got).padStart(8)} · 正文 ${r.token}  ${mark}`);
  }
  console.log('');
  console.log(`阳性预测值的分子分母：真阳性 ${p.tp.toExponential(3)} · 假阳性 ${p.fp.toExponential(3)} —— 假阳性是真阳性的 ${(p.fp / p.tp).toFixed(1)} 倍。`);
  console.log('读法：每新增一条信息，分母被剔除一类人；阳性预测值由患病率主导，不由准确率主导。');
  console.log('※ 90%、99%、1/1000 及由此推出的 1/11、4.1%、0.045%、9% 均为教学设定与算例推导，不代表任何真实疾病或检测的性能。');
  console.log('※ 本输出仅用于教学演示，不构成医学意见、风险预测或治疗建议。');
  if (rows.some((r) => !r.ok)) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, figures, chain, ppv };

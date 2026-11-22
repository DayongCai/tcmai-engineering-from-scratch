#!/usr/bin/env node
/**
 * 中医大数据分析 · 第 7 章 设计决定你能问什么问题
 * 正文: departments/07-zhineng/09-zhongyi-dashuju-fenxi/chapters/07-s7/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：似然比、三档验前概率的验后概率、诊断试验样本量、决策曲线的净收益，
 * 全部由正文的 Sens／Spec、验前概率表与 TP／FP 现算；结果要回落到正文写法。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 7;
const SLUG = '07-s7';
const TITLE = '设计决定你能问什么问题';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s || '').match(HANZI) || []).length;

const readDoc = () => fs.readFileSync(DOC, 'utf8');

function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, '').trim());
}

function tables(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^\|[\s:|-]*---[\s:|-]*\|$/.test(l)).length;
}

const citations = (text) => [...text.matchAll(/《([^》]+)》/g)].map((m) => m[1]);

/** 敏感度与特异度 → 两个似然比 */
function likelihoodRatios(text) {
  const m = text.match(/Sens\s*\$?=([\d.]+)\$?、Spec\s*\$?=([\d.]+)\$?/);
  if (!m) throw new Error('正文缺 Sens 与 Spec');
  const sens = Number(m[1]);
  const spec = Number(m[2]);
  return { sens, spec, lrPos: sens / (1 - spec), lrNeg: (1 - sens) / spec };
}

/** 验前概率表：每一行重算验后概率 */
function postTestTable(text, lr) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\|\s*(\d+)%\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*\*\*([\d.]+)%\*\*\s*\|\s*([\d.]+)%\s*\|$/);
    if (!m) continue;
    const prior = Number(m[1]) / 100;
    const preOdds = prior / (1 - prior);
    const postOdds = preOdds * lr.lrPos;
    rows.push({
      prior,
      preOdds,
      postOdds,
      postProb: postOdds / (1 + postOdds),
      statedPost: Number(m[4]),
      statedOdds: Number(m[3]),
      negPostProb: (preOdds * lr.lrNeg) / (1 + preOdds * lr.lrNeg),
      statedNeg: Number(m[5]),
    });
  }
  if (rows.length < 3) throw new Error(`验前概率表只读到 ${rows.length} 行`);
  return rows;
}

/** 诊断试验的样本量：按精度算，不按效能算 */
function dxSampleSize(text) {
  const w = text.match(/敏感度到\s*\$\\pm([\d.]+)\$/);
  const s = text.match(/取 Sens\s*\$?=([\d.]+)\$?\s*得约\s*(\d+)\s*例/);
  if (!w || !s) throw new Error('正文缺诊断试验样本量算例');
  const width = Number(w[1]);
  const sens = Number(s[1]);
  const stated = Number(s[2]);
  const n = (1.96 / width) ** 2 * sens * (1 - sens);
  return { width, sens, n, stated };
}

/** 决策曲线的净收益 */
function netBenefit(text) {
  const pt = text.match(/p_t=([\d.]+)/);
  const n = text.match(/n=([\d{},]+)、患病率\s*(\d+)%/);
  const tp = text.match(/TP=(\d+)\$?、\$?FP=(\d+)/);
  if (!pt || !tp) throw new Error('正文缺决策曲线算例');
  const threshold = Number(pt[1]);
  const tpN = Number(tp[1]);
  const fpN = Number(tp[2]);
  const total = n ? Number(n[1].replace(/[{},]/g, '')) : 1000;
  const prevalence = n ? Number(n[2]) / 100 : 0.1;
  const model = tpN / total - (fpN / total) * (threshold / (1 - threshold));
  const treatAll = prevalence - (1 - prevalence) * (threshold / (1 - threshold));
  return { threshold, tp: tpN, fp: fpN, total, prevalence, model, treatAll, gain: model - treatAll };
}

function compute(text) {
  const lr = likelihoodRatios(text);
  return {
    lr,
    table: postTestTable(text, lr),
    sample: dxSampleSize(text),
    dca: netBenefit(text),
  };
}

function verify(text) {
  const c = compute(text);
  const need = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };
  need(c.lr.lrPos.toFixed(1) === '8.5' && text.includes('8.5'), '阳性似然比应为 8.5');
  need(Math.abs(c.lr.lrNeg - 0.1667) < 1e-3 && text.includes('0.167'), '阴性似然比应约为 0.167');
  for (const r of c.table) {
    need(Math.abs(r.postProb * 100 - r.statedPost) < 0.15, `验前 ${r.prior * 100}% 的验后概率重算 ${(r.postProb * 100).toFixed(1)}%，表内写 ${r.statedPost}%`);
    need(text.includes(r.statedPost.toFixed(1) + '%'), `验前 ${r.prior * 100}% 的验后概率未回落到正文`);
  }
  need(c.table[0].postProb < 0.35 && c.table[2].postProb > 0.9, '验后概率应随验前概率单调上升');
  need(c.sample.n.toFixed(1) === '195.9' && c.sample.stated === 196, `样本量重算为 ${c.sample.n.toFixed(1)}，正文写约 196`);
  need(c.dca.model.toFixed(4) === '0.0655' && text.includes('0.0655'), `模型净收益重算为 ${c.dca.model.toFixed(4)}`);
  need(c.dca.treatAll.toFixed(3) === '-0.125' && text.includes('-0.125'), `全治净收益重算为 ${c.dca.treatAll.toFixed(3)}`);
  return c;
}

function stats(text) {
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    hanzi: hanzi(text),
    sections: headings(text).length,
    tables: tables(text),
    cites: citations(text).length,
    drills: (text.match(/演算设定/g) || []).length,
    disclaimer: /免责声明/.test(text),
  };
}

function main() {
  const text = readDoc();
  const s = stats(text);
  const c = verify(text);
  const pct = (x) => `${(x * 100).toFixed(1)}%`;

  console.log(`中医大数据分析 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字 ${s.hanzi.toLocaleString('en-US')} · 节 ${s.sections} · 表 ${s.tables} · 引文 ${s.cites} 处 · 演算设定 ${s.drills} 处`);
  console.log('');
  console.log(`Sens ${c.lr.sens} · Spec ${c.lr.spec} → LR+ ${c.lr.lrPos.toFixed(1)}，LR− ${c.lr.lrNeg.toFixed(3)}。`);
  console.log('验前 → 验后（阳性）：');
  for (const r of c.table) {
    console.log(`  验前 ${(r.prior * 100).toFixed(0)}%  odds ${r.preOdds.toFixed(3)} × ${c.lr.lrPos.toFixed(1)} = ${r.postOdds.toFixed(2)} → ${pct(r.postProb)}（表内 ${r.statedPost}%）；阴性后 ${pct(r.negPostProb)}（表内 ${r.statedNeg}%）`);
  }
  console.log('');
  console.log('');
  const drift = c.table.filter((r) => Math.abs(r.negPostProb * 100 - r.statedNeg) > 0.3);
  if (drift.length) {
    for (const r of drift) {
      console.log(`注：验前 ${(r.prior * 100).toFixed(0)}% 的阴性后概率按 0.167 重算为 ${pct(r.negPostProb)}，正文表内写 ${r.statedNeg}%；以重算为准，正文该格待校。`);
    }
  }
  console.log(`诊断试验样本量：±${c.sample.width}、Sens ${c.sample.sens} → ${c.sample.n.toFixed(1)} 例，取约 ${c.sample.stated} 例。`);
  console.log(`决策曲线：p_t=${c.dca.threshold}，TP=${c.dca.tp}、FP=${c.dca.fp}，模型净收益 ${c.dca.model.toFixed(4)}，全部治疗 ${c.dca.treatAll.toFixed(3)}，差 ${c.dca.gain.toFixed(3)}。`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：Sens／Spec 或验前概率一改，验后概率与净收益跟着变。');
  console.log('※ 本章数值为演算设定，不对应任何真实模型或数据库。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  readDoc,
  headings,
  tables,
  citations,
  hanzi,
  likelihoodRatios,
  compute,
  verify,
  stats,
  main,
};

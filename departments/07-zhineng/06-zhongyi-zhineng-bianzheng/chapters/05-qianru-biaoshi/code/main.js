#!/usr/bin/env node
/**
 * 第 5 章 · 表示体检：三条路线、三种语料偏差、三个失效，外加两个能直接算的判据
 *
 *   数据: chapters/05-qianru-biaoshi/docs/zh.md（本章正文，唯一数据源）
 *   运行: node code/main.js
 *
 * 两处现算：
 *   1) 跨语料判据 —— 一个邻居关系在几种语料里成立？≥2 才算语义关系，只 1 种先当语料伪影。
 *   2) 各向异性阈值 —— 正文给的余弦值（0.6 与 0.75）在固定阈值下能不能区分开。
 * 都是对正文论据的直接核算，不训练嵌入，也不报任何检索命中率。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CORPORA = ['病历', '教材', '古籍'];

const loadDoc = () => fs.readFileSync(DOC, 'utf8');
const hanzi = (s) => (String(s).match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function sections(md) {
  const out = [{ heading: '（章首）', body: [] }];
  for (const line of md.split(/\r?\n/)) {
    if (/^##\s+/.test(line)) out.push({ heading: line.replace(/^##\s+/, '').trim(), body: [] });
    else out[out.length - 1].body.push(line);
  }
  return out.map((s) => ({ heading: s.heading, body: s.body.join('\n') }));
}

function tables(md) {
  const out = [];
  let cur = null;
  for (const line of md.split(/\r?\n/)) {
    if (!/^\s*\|.*\|\s*$/.test(line)) { cur = null; continue; }
    if (/^[\s:|-]+$/.test(line.replace(/\|/g, ''))) continue;
    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (!cur) { cur = { header: cells, rows: [] }; out.push(cur); continue; }
    cur.rows.push(cells);
  }
  return out;
}

/** 跨语料判据：成立语料数 ≥2 → 语义关系；1 → 语料伪影；0 → 无依据 */
function judgeNeighbor(corpora) {
  const hit = CORPORA.filter((c) => corpora.includes(c));
  if (hit.length >= 2) return { verdict: '语义关系', support: hit };
  if (hit.length === 1) return { verdict: '语料伪影', support: hit };
  return { verdict: '无依据', support: [] };
}

/** 固定阈值下的过召：所有候选都 ≥ 阈值时，阈值不提供鉴别 */
function thresholdDiscriminates(pairs, theta) {
  const passed = pairs.filter((p) => p.cosine >= theta);
  return { passed: passed.length, total: pairs.length, discriminates: passed.length < pairs.length };
}

function audit(md = loadDoc()) {
  const secs = sections(md);
  const t = tables(md);
  const rowOf = (pred) => { const x = t.find(pred); return x ? x.rows.length : 0; };

  const routeRows = rowOf((x) => x.header.some((h) => /可解释/.test(h)) && x.header.some((h) => /相似性/.test(h)));
  const corpusRows = rowOf((x) => x.header.some((h) => /偏差来源/.test(h)));
  const failRows = rowOf((x) => x.header.some((h) => /诊断/.test(h)));
  const useRows = rowOf((x) => x.header.some((h) => /可用性/.test(h)));

  // 各向异性一节里的两个余弦值，正文原句给出
  const iso = secs.find((s) => /距离不等于鉴别/.test(s.heading));
  const cosines = iso ? [...iso.body.matchAll(/0\.\d+/g)].map((m) => Number(m[0])) : [];
  const pairs = [
    { a: '口干', b: '失眠', cosine: cosines[0] },
    { a: '口干', b: '口渴', cosine: cosines[1] },
  ].filter((p) => Number.isFinite(p.cosine));
  const theta = 0.6;
  const disc = thresholdDiscriminates(pairs, theta);

  const missing = [];
  if (routeRows !== 3) missing.push(`三条路线表 ${routeRows} 行（应 3）`);
  if (corpusRows !== 3) missing.push(`语料偏差表 ${corpusRows} 行（应 3）`);
  if (failRows !== 3) missing.push(`失效模式表 ${failRows} 行（应 3）`);
  if (useRows !== 4) missing.push(`用途表 ${useRows} 行（应 4）`);
  if (pairs.length < 2) missing.push('各向异性一节未给出两个可比的余弦值');
  if (!/至少要在两种语料里成立/.test(md)) missing.push('跨语料判据没有明确写出');
  if (!/相邻证型是否分得开/.test(md)) missing.push('嵌入可用性的判据没有写成鉴别而非聚类');

  return {
    sections: secs.map((s) => s.heading),
    hanzi: hanzi(md),
    routeRows,
    corpusRows,
    failRows,
    useRows,
    pairs,
    theta,
    disc,
    corpora: CORPORA,
    missing,
  };
}

function main() {
  const a = audit();
  console.log(`本章正文 ${a.sections.length - 1} 节 · ${a.hanzi} 汉字`);
  console.log('');
  console.log(`三条路线 ${a.routeRows} 行 · 语料偏差 ${a.corpusRows} 种 · 失效 ${a.failRows} 种 · 用途 ${a.useRows} 种`);
  console.log('');
  console.log('跨语料判据（≥2 种语料成立才算语义关系）：');
  for (const case_ of [
    ['病历', '教材'],
    ['教材'],
    ['病历', '教材', '古籍'],
    [],
  ]) {
    const j = judgeNeighbor(case_);
    console.log(`  成立于 ${case_.length ? case_.join('/') : '（无）'} → ${j.verdict}`);
  }
  console.log('');
  console.log(`各向异性（正文给的余弦值，阈值 ${a.theta}）：`);
  for (const p of a.pairs) console.log(`  ${p.a} ↔ ${p.b}：${p.cosine}${p.cosine >= a.theta ? '（过阈）' : ''}`);
  console.log(`  过阈 ${a.disc.passed}/${a.disc.total} —— ${a.disc.discriminates ? '尚可区分' : '阈值不提供鉴别，用固定阈值判断「相似即相关」必然过召'}`);
  console.log('');
  console.log(a.missing.length ? `缺口 ${a.missing.length} 处：${a.missing.join('；')}` : '缺口 0 处：路线、语料、失效、用途四处均可核对。');
  console.log('');
  console.log('※ 余弦值取自本章正文的假设性举例，仅用于说明阈值问题，不是检索实测。');
  console.log('※ 本章讨论嵌入表示的方法与边界，不构成诊断或治疗建议。');
}

if (require.main === module) main();

module.exports = { DOC, CORPORA, loadDoc, sections, tables, judgeNeighbor, thresholdDiscriminates, audit };

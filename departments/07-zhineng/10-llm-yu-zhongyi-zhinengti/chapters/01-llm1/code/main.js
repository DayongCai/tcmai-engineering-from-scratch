#!/usr/bin/env node
/**
 * 大模型与中医智能体 · 第 1 章 特征是人挑的，表示是数据自己长出来的
 * 课程: departments/07-zhineng/10-llm-yu-zhongyi-zhinengti/chapters/01-llm1/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部从正文现场读出再算：词表规模 × 向量维度 → 嵌入表参数量；
 * 规范证候名 × 别名均值 → 实际字符串数；余弦表 → 近义对与不同义对的落差。
 * 正文里没有的量，脚本不补，也不替任何模型报分。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const readDoc = () => fs.readFileSync(DOC, 'utf8');
const toInt = (s) => Number(String(s).replace(/[{},]/g, ''));

/** 从「$12{,}000\times768 = 9{,}216{,}000$ 个参数，约 921.6 万」读出词表、维度、参数量 */
function parseEmbedding(text) {
  const m = text.match(/(\d[\d,{}]*)\\times\s*(\d+)\s*=\s*(\d[\d,{}]*)\$?\s*个参数/);
  if (!m) throw new Error('正文里没找到「词表 × 维度 = 参数量」这一句');
  return { vocab: toInt(m[1]), dim: Number(m[2]), params: toInt(m[3]) };
}

/** 从「规范证候名 400 个，别名平均 2.5 个，实际字符串约 1,000 种」读长尾规模 */
function parseAliasScale(text) {
  const m = text.match(/规范证候名\s*(\d+)\s*个，别名平均\s*([\d.]+)\s*个，实际字符串约\s*([\d,]+)\s*种/);
  if (!m) throw new Error('正文里没找到「规范名 / 别名均值 / 实际字符串」这一句');
  return { names: Number(m[1]), aliases: Number(m[2]), strings: toInt(m[3]) };
}

/** 读正文余弦表的每一行：| 词对（甲 — 乙） | 余弦 | 判断 | */
function parseCosineTable(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 4) continue;
    const pair = cells[1].split('—');
    if (pair.length !== 2) continue;
    const cos = Number(cells[2]);
    if (!Number.isFinite(cos)) continue;
    rows.push({ a: pair[0].trim(), b: pair[1].trim(), cos, verdict: cells[3] || '' });
  }
  return rows;
}

/** 同形不同指：正文该行的判断里点了名（中风外感 / 中风脑卒中） */
const isHomograph = (r) => /同形不同指/.test(r.verdict);

/** 正文判为近义的对：应当接近／符合 ／字面与语义都近 */
const isSynonym = (r) => /应当接近|符合|语义也近/.test(r.verdict);

function mean(xs) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
}

function summarize(rows) {
  const syn = rows.filter(isSynonym).map((r) => r.cos);
  const homo = rows.filter(isHomograph);
  const apart = rows.filter((r) => !isSynonym(r) && !isHomograph(r)).map((r) => r.cos);
  return {
    rows: rows.length,
    synonyms: syn.length,
    synonymMean: mean(syn),
    homographs: homo,
    apartMean: mean(apart),
    gap: mean(syn) - mean(apart),
  };
}

function main() {
  const doc = readDoc();
  const emb = parseEmbedding(doc);
  const alias = parseAliasScale(doc);
  const rows = parseCosineTable(doc);
  const s = summarize(rows);

  console.log('═══ 特征是人挑的，表示是数据自己长出来的 ═══');
  console.log('');

  console.log('一、嵌入表的实际成本（正文数值，现算校验）：');
  console.log(`  词表 ${emb.vocab.toLocaleString('en-US')} × 维度 ${emb.dim} = ${emb.params.toLocaleString('en-US')} 参数`);
  console.log(`  正文口径：约 ${(emb.params / 1e4).toFixed(1)} 万；复算一致：${emb.vocab * emb.dim === emb.params ? '是' : '否'}`);
  console.log(`  平均每个词 ${emb.dim} 个待估参数 —— one-hot 不占参数，它只是坐标。`);
  console.log('');

  console.log('二、长尾规模（同一句现读）：');
  console.log(`  规范名 ${alias.names} 个 × 别名均值 ${alias.aliases} = ${alias.names * alias.aliases} 种写法`);
  console.log(`  正文记约 ${alias.strings.toLocaleString('en-US')} 种；复算一致：${alias.names * alias.aliases === alias.strings ? '是' : '否'}`);
  console.log(`  每类样本极少时，监督分类器学不出稳定边界 —— 这是字段路线的天花板，不是算法问题。`);
  console.log('');

  console.log('三、余弦表逐行（正文表原样读出）：');
  for (const r of rows) {
    const tag = isHomograph(r) ? '同形不同指' : isSynonym(r) ? '近义' : '不同义';
    console.log(`  ${r.a} — ${r.b}：${r.cos.toFixed(2)}（${tag}）`);
  }
  console.log('');
  console.log(`  近义对均值 ${s.synonymMean.toFixed(3)}（${s.synonyms} 对）｜ 不同义对均值 ${s.apartMean.toFixed(3)} ｜ 落差 ${s.gap.toFixed(3)}`);
  for (const r of s.homographs) {
    console.log(`  ✗ ${r.a} — ${r.b} = ${r.cos.toFixed(2)}，比近义对均值还高 ${(r.cos - s.synonymMean).toFixed(3)}：写法相同被当成意思相同。`);
  }
  console.log('');

  console.log('四、一句话：');
  console.log('  覆盖率上去了，可定位性与可复现性下来了；主判据写在设计文档里，向量只做召回与排序。');
  console.log('');
  console.log('※ 本章数字均从 docs/zh.md 现读现算，正文为演算设定，不对应任何实测模型；输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  readDoc,
  parseEmbedding,
  parseAliasScale,
  parseCosineTable,
  isHomograph,
  isSynonym,
  summarize,
  main,
};

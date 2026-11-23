#!/usr/bin/env node
/**
 * 中医各家学说 · 第 3 章 「三法该尽治病」的可检版本：出口 120 条，禁令 80 条
 * 课程: departments/01-zhongyi/15-zhongyi-gejia-xueshuo/chapters/03-zhangcongzheng-gongxie/docs/zh.md
 * 数据: standards/shanghan/底本.json · standards/gejia/学派库.json
 * 依赖: 仅 Node.js 标准库
 *
 * 只读：三个方向的许可条数与禁令条数、单字命中、可攻诸篇的篇幅与含字比例，
 * 全部当次现算，再与正文两张表逐格对照；对不上就抛错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const TITLE = '「三法该尽治病」的可检版本：出口 120 条，禁令 80 条';

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'gejia', '学派库.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/gejia/学派库.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const readJSON = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');

/** 《伤寒论》1,760 条 */
function shanghan() {
  const sh = readJSON('standards/shanghan/底本.json');
  return sh.pian.flatMap((p, pi) =>
    p.items.map((it, ii) => ({ pian: p.pian, pi, ii, no: it.no, text: it.text })));
}

const hits = (list, word) => list.reduce((n, t) => n + (t.text.includes(word) ? 1 : 0), 0);
const hitUnion = (list, terms) => list.reduce((n, t) => n + (terms.some((w) => t.text.includes(w)) ? 1 : 0), 0);

/** 三部底本合起来 2,792 条（单字命中与学派词表用这个总量） */
function corpusAll() {
  const sh = readJSON('standards/shanghan/底本.json');
  const jg = readJSON('standards/jingui/底本.json');
  const wb = readJSON('standards/wenbing/底本.json');
  const shanghan = sh.pian.flatMap((p) => p.items.map((it) => ({ text: it.text })));
  const jingui = jg.pian.flatMap((p) => p.articles.map((a) => ({ text: a.zhHans })));
  const wenbing = wb.books.flatMap((b) => b.sections.flatMap((s) => s.articles.map((a) => ({ text: a.zhHans }))));
  return [...shanghan, ...jingui, ...wenbing];
}

function tables(md) {
  const lines = md.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\s*\|/.test(lines[i])) continue;
    if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) continue;
    const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((s) => s.trim());
    const rows = [];
    let j = i + 2;
    while (j < lines.length && /^\s*\|/.test(lines[j])) { rows.push(cells(lines[j])); j += 1; }
    out.push({ header: cells(lines[i]), rows });
    i = j - 1;
  }
  return out;
}
const num = (s) => {
  const m = String(s == null ? '' : s).replace(/[,\s]/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
};

/** 三组「可／不可」对照。与正文同口径：按字串检索，含「不可」的条文也会被「可」字串计入，未逐条剔除 */
const DIRECTIONS = [
  { key: '汗', permit: '可发汗', forbid: '不可发汗', word: '汗' },
  { key: '下', permit: '可下', forbid: '不可下', word: '下' },
  { key: '吐', permit: '可吐', forbid: '不可吐', word: '吐' },
];

function byPian(list, name) {
  const its = list.filter((t) => t.pian === name);
  return { total: its.length };
}

function analyze() {
  const md = readDoc();
  const list = shanghan();
  const all = corpusAll();
  const school = readJSON('standards/gejia/学派库.json').schools.find((s) => s.key === 'zhang-congzheng');
  if (!school) throw new Error('学派库里找不到 zhang-congzheng');

  const rows = DIRECTIONS.map((d) => {
    const p = hits(list, d.permit);
    const f = hits(list, d.forbid);
    return { ...d, permitN: p, forbidN: f, ratio: f / p, wordN: hits(all, d.word) };
  });
  const permitTotal = rows.reduce((n, r) => n + r.permitN, 0);
  const forbidTotal = rows.reduce((n, r) => n + r.forbidN, 0);

  const pianStats = [
    { name: '辨可下病脉证并治', word: '下' },
    { name: '辨可发汗病脉证并治', word: '汗' },
    { name: '辨发汗后病脉证并治', word: '汗' },
  ].map((s) => {
    const its = list.filter((t) => t.pian === s.name);
    const n = its.filter((t) => t.text.includes(s.word)).length;
    return { ...s, total: its.length, contain: n, share: n / its.length };
  });

  const schoolHits = {
    total: hitUnion(all, school.terms),
    share: hitUnion(all, school.terms) / all.length,
  };

  const docTables = tables(md);
  const outTable = docTables.find((t) => t.header.includes('出口') && t.header.join('|').includes('命中条数'));
  const gateTable = docTables.find((t) => t.header.includes('方向') && t.header.join('|').includes('许可条数'));
  if (!outTable) throw new Error('正文里找不到三出口表');
  if (!gateTable) throw new Error('正文里找不到许可/禁令复算表');

  const mismatches = [];
  for (const r of rows) {
    const line = gateTable.rows.find((x) => x[0] === r.key);
    if (!line) { mismatches.push(`复算表缺「${r.key}」一行`); continue; }
    if (num(line[1]) !== r.permitN) mismatches.push(`${r.key} 许可：正文 ${num(line[1])}，现算 ${r.permitN}`);
    if (num(line[2]) !== r.forbidN) mismatches.push(`${r.key} 禁令：正文 ${num(line[2])}，现算 ${r.forbidN}`);
    if (Math.abs((num(line[3]) || 0) - r.ratio) > 0.005) mismatches.push(`${r.key} 比值：正文 ${num(line[3])}，现算 ${r.ratio.toFixed(3)}`);
  }
  const tot = gateTable.rows.find((x) => x[0].includes('合计'));
  if (!tot) mismatches.push('复算表缺合计行');
  else {
    if (num(tot[1]) !== permitTotal) mismatches.push(`合计许可：正文 ${num(tot[1])}，现算 ${permitTotal}`);
    if (num(tot[2]) !== forbidTotal) mismatches.push(`合计禁令：正文 ${num(tot[2])}，现算 ${forbidTotal}`);
  }
  for (const r of rows) {
    const line = outTable.rows.find((x) => x[0] === r.key);
    if (!line) { mismatches.push(`出口表缺「${r.key}」一行`); continue; }
    if (num(line[3]) !== r.wordN) mismatches.push(`${r.key} 含字条数：正文 ${num(line[3])}，现算 ${r.wordN}`);
  }

  return {
    md, total: list.length, rows, permitTotal, forbidTotal,
    totalRatio: forbidTotal / permitTotal, pianStats, schoolHits, mismatches, docTables: docTables.length,
  };
}

function main() {
  const a = analyze();
  const w = (s) => [...String(s)].reduce((n, ch) => n + (/[\u4e00-\u9fff]/.test(ch) ? 2 : 1), 0);
  const pad = (s, n) => String(s) + ' '.repeat(Math.max(1, n - w(s)));

  console.log(`中医各家学说 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字当次现算：《伤寒论》1,760 条的关键词检索 + 学派库词表）');
  console.log('');
  console.log(`${pad('方向', 6)}${pad('许可', 8)}${pad('禁令', 8)}禁令/许可`);
  for (const r of a.rows) console.log(`${pad(r.key, 6)}${pad(r.permitN, 8)}${pad(r.forbidN, 8)}${r.ratio.toFixed(2)}`);
  console.log(`${pad('合计', 6)}${pad(a.permitTotal, 8)}${pad(a.forbidTotal, 8)}${a.totalRatio.toFixed(2)}`);
  console.log('');
  console.log(`单字命中：下 ${a.rows[1].wordN} · 汗 ${a.rows[0].wordN} · 吐 ${a.rows[2].wordN}`);
  console.log('可攻诸篇的篇幅与含字比例：');
  for (const p of a.pianStats) console.log(`  ${p.name}：${p.total} 条中 ${p.contain} 条含「${p.word}」，${(p.share * 100).toFixed(1)}%`);
  console.log('');
  console.log(`张从正词表命中 ${a.schoolHits.total} 条，占 2,792 的 ${(a.schoolHits.share * 100).toFixed(1)}% —— 由基本动词撑起，不是主张的强度`);
  console.log('');
  console.log(`正文对照：${a.docTables} 张表逐格复算，不符 ${a.mismatches.length} 处`);
  for (const m of a.mismatches) console.log('  - ' + m);
  console.log('');
  console.log('※ 教学样例：数字由本库语料现算，不构成诊疗建议，尤其不构成对任何攻逐类治法的推荐。');

  if (a.mismatches.length) throw new Error(`正文与复算不一致 ${a.mismatches.length} 处：\n${a.mismatches.join('\n')}`);
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, ROOT, readJSON, readDoc, shanghan, hits, hitUnion, tables, num, DIRECTIONS, analyze };

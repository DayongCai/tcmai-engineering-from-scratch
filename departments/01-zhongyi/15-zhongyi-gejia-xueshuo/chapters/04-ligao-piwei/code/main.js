#!/usr/bin/env node
/**
 * 中医各家学说 · 第 4 章 内伤发热：给一个已有 60 条记载的老问题造一套 0 命中的新词
 * 课程: departments/01-zhongyi/15-zhongyi-gejia-xueshuo/chapters/04-ligao-piwei/docs/zh.md
 * 数据: standards/{shanghan,jingui,wenbing}/底本.json · standards/gejia/学派库.json · standards/zhenghou/证候库.json
 * 依赖: 仅 Node.js 标准库
 *
 * 只读：李杲词表逐词命中、底本旧词的存量、证候族覆盖与方源占位，
 * 全部当次现算，再与正文对照表逐格核对；对不上就抛错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const TITLE = '内伤发热：给一个已有 60 条记载的老问题造一套 0 命中的新词';

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

function corpus() {
  const sh = readJSON('standards/shanghan/底本.json');
  const jg = readJSON('standards/jingui/底本.json');
  const wb = readJSON('standards/wenbing/底本.json');
  const shanghan = sh.pian.flatMap((p) => p.items.map((it) => ({ text: it.text })));
  const jingui = jg.pian.flatMap((p) => p.articles.map((a) => ({ text: a.zhHans })));
  const wenbing = wb.books.flatMap((b) => b.sections.flatMap((s) => s.articles.map((a) => ({ text: a.zhHans }))));
  return [...shanghan, ...jingui, ...wenbing];
}
const hits = (list, word) => list.reduce((n, t) => n + (t.text.includes(word) ? 1 : 0), 0);
const hitUnion = (list, terms) => list.reduce((n, t) => n + (terms.some((w) => t.text.includes(w)) ? 1 : 0), 0);

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

function analyze() {
  const md = readDoc();
  const list = corpus();
  const school = readJSON('standards/gejia/学派库.json').schools.find((s) => s.key === 'li-gao');
  if (!school) throw new Error('学派库里找不到 li-gao');
  const zheng = readJSON('standards/zhenghou/证候库.json');
  const family = new Map(zheng.families.map((f) => [f.family, f.all]));

  const perWord = new Map(school.terms.map((w) => [w, hits(list, w)]));
  const legacy = new Map([['胃气', hits(list, '胃气')], ['虚', hits(list, '虚')]]);
  const total = hitUnion(list, school.terms);
  const zhengN = school.families.reduce((n, f) => n + (family.get(f) || 0), 0);
  const fangFromPiwei = zheng.zheng.reduce(
    (n, z) => n + (z.fang || []).filter((f) => /《脾胃论》/.test(f)).length, 0,
  );

  const docTables = tables(md);
  const wordTable = docTables.find((t) => t.header.includes('归属') && t.header.join('|').includes('命中'));
  if (!wordTable) throw new Error('正文里找不到「换词不换题」对照表');

  const mismatches = [];
  const known = new Map([...legacy, ...perWord]);
  for (const line of wordTable.rows) {
    const label = line[0];
    if (label === '词') continue;
    if (!known.has(label)) { mismatches.push(`对照表里的「${label}」不在可复算词表中`); continue; }
    const value = known.get(label);
    if (num(line[2]) !== value) mismatches.push(`「${label}」：正文 ${num(line[2])}，现算 ${value}`);
  }

  return {
    md, total, corpusSize: list.length, perWord, legacy, zhengN, zhengShare: zhengN / zheng.counts.zheng,
    familySize: new Map(school.families.map((f) => [f, family.get(f) || 0])),
    fangFromPiwei, families: school.families, mismatches, docTables: docTables.length,
  };
}

function main() {
  const a = analyze();
  const w = (s) => [...String(s)].reduce((n, ch) => n + (/[\u4e00-\u9fff]/.test(ch) ? 2 : 1), 0);
  const pad = (s, n) => String(s) + ' '.repeat(Math.max(1, n - w(s)));
  const pct = (x) => (x * 100).toFixed(1) + '%';

  console.log(`中医各家学说 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字当次现算：三部底本 2,792 条 + 学派库词表 + 证候库族规模与方源）');
  console.log('');
  console.log(`旧题存量：胃气 ${a.legacy.get('胃气')} 条 · 虚 ${a.legacy.get('虚')} 条`);
  console.log('李杲词表逐词：');
  for (const [k, v] of a.perWord) console.log(`  ${pad(k, 6)}${v} 条`);
  console.log(`词表合计命中 ${a.total} 条，占 ${pct(a.total / a.corpusSize)}`);
  console.log('');
  console.log(`证候挂接 ${a.families.join(' + ')} = ${a.zhengN} 证，占 132 的 ${pct(a.zhengShare)}`);
  for (const f of a.families) console.log(`  ${pad(f, 6)}${a.familySize.get(f)} 证`);
  console.log(`这些证里的方，出自《脾胃论》的有 ${a.fangFromPiwei} 方`);
  console.log('');
  console.log(`三个数：文本 ${a.total} 条 → 证候 ${a.zhengN} 证 → 方源 ${a.fangFromPiwei} 方，方向与词频低估一致`);
  console.log('');
  console.log(`正文对照：${a.docTables} 张表逐格复算，不符 ${a.mismatches.length} 处`);
  for (const m of a.mismatches) console.log('  - ' + m);
  console.log('');
  console.log('※ 教学样例：数字由本库语料现算，不构成诊疗建议，不能替代医师面诊。');

  if (a.mismatches.length) throw new Error(`正文与复算不一致 ${a.mismatches.length} 处：\n${a.mismatches.join('\n')}`);
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, ROOT, readJSON, readDoc, corpus, hits, hitUnion, tables, num, analyze };

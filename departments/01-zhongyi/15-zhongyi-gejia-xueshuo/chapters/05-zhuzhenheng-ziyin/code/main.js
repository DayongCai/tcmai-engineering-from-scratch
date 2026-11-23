#!/usr/bin/env node
/**
 * 中医各家学说 · 第 5 章 相火论把「火」从病邪改写成身体的常驻设施
 * 课程: departments/01-zhongyi/15-zhongyi-gejia-xueshuo/chapters/05-zhuzhenheng-ziyin/docs/zh.md
 * 数据: standards/{shanghan,jingui,wenbing}/底本.json · standards/gejia/学派库.json · standards/zhenghou/证候库.json
 * 依赖: 仅 Node.js 标准库
 *
 * 只读：相火与四虚的命中、证候族覆盖、两个比例之商，
 * 全部当次现算，再与正文表逐格核对；对不上就抛错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const TITLE = '相火论把「火」从病邪改写成身体的常驻设施';

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

const WORDS = ['相火', '君火', '阴虚', '气虚', '血虚', '阳虚', '痰'];

function analyze() {
  const md = readDoc();
  const list = corpus();
  const school = readJSON('standards/gejia/学派库.json').schools.find((s) => s.key === 'zhu-zhenheng');
  if (!school) throw new Error('学派库里找不到 zhu-zhenheng');
  const zheng = readJSON('standards/zhenghou/证候库.json');
  const family = new Map(zheng.families.map((f) => [f.family, f.all]));

  const wordHits = new Map(WORDS.map((w) => [w, hits(list, w)]));
  const total = hitUnion(list, school.terms);
  const coreWords = ['相火', '阴虚'];
  const core = hitUnion(list, coreWords);
  const zhengN = school.families.reduce((n, f) => n + (family.get(f) || 0), 0);
  const zhengShare = zhengN / zheng.counts.zheng;
  const textShare = total / list.length;
  const coreShare = core / list.length;
  const ratio = zhengShare / textShare;
  /** 正文用两位百分数的取整值相除（26.5 / 0.14），得到 189 */
  const ratioCore = (Math.round(zhengShare * 1000) / 10) / (Math.round(coreShare * 10000) / 100);

  // 四虚排序：阴虚是不是记载最少的一种
  const fourVoid = ['血虚', '气虚', '阳虚', '阴虚'].map((w) => ({ w, n: wordHits.get(w) }));
  const least = [...fourVoid].sort((a, b) => a.n - b.n)[0];

  const docTables = tables(md);
  const wordTable = docTables.find((t) => t.header.includes('2,792 条命中') && t.header.join('|').includes('在《素问》选读中的出现'));
  if (!wordTable) throw new Error('正文里找不到相火与四虚的命中表');

  const mismatches = [];
  for (const line of wordTable.rows) {
    const label = line[0];
    if (!wordHits.has(label)) { mismatches.push(`命中表里的「${label}」不在可复算词表中`); continue; }
    if (num(line[1]) !== wordHits.get(label)) mismatches.push(`「${label}」：正文 ${num(line[1])}，现算 ${wordHits.get(label)}`);
  }

  return {
    md, wordHits, total, core, coreWords, corpusSize: list.length, zhengN, zhengShare, textShare, coreShare, ratio, ratioCore,
    families: school.families, familySize: new Map(school.families.map((f) => [f, family.get(f) || 0])),
    fourVoid, least, mismatches, docTables: docTables.length,
  };
}

function main() {
  const a = analyze();
  const pct = (x) => (x * 100).toFixed(2) + '%';
  const w = (s) => [...String(s)].reduce((n, ch) => n + (/[\u4e00-\u9fff]/.test(ch) ? 2 : 1), 0);
  const pad = (s, n) => String(s) + ' '.repeat(Math.max(1, n - w(s)));

  console.log(`中医各家学说 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字当次现算：三部底本 2,792 条 + 学派库词表 + 证候库族规模）');
  console.log('');
  console.log('逐词命中：');
  for (const [k, v] of a.wordHits) console.log(`  ${pad(k, 6)}${v} 条`);
  console.log(`朱震亨词表合计 ${a.total} 条，占 ${pct(a.textShare)}`);
  console.log(`收到最核心的两个词（${a.coreWords.join('、')}）：${a.core} 条，占 ${pct(a.coreShare)}`);
  console.log('');
  console.log('四种虚的记载量（阴虚垫底 = 命名晚，不是病少）：');
  for (const x of a.fourVoid) console.log(`  ${pad(x.w, 6)}${x.n} 条`);
  console.log(`  最少的一格是「${a.least.w}」`);
  console.log('');
  console.log(`证候挂接 ${a.families.join(' + ')} = ${a.zhengN} 证，占 132 的 ${pct(a.zhengShare)}`);
  for (const f of a.families) console.log(`  ${pad(f, 6)}${a.familySize.get(f)} 证`);
  console.log(`两个比例的商：${pct(a.zhengShare)} / ${pct(a.coreShare)} ≈ ${a.ratioCore.toFixed(0)} 倍（分母不同，只作提醒，无统计含义）`);
  console.log('');
  console.log(`正文对照：${a.docTables} 张表逐格复算，不符 ${a.mismatches.length} 处`);
  for (const m of a.mismatches) console.log('  - ' + m);
  console.log('');
  console.log('※ 教学样例：数字由本库语料现算，不构成诊疗建议，不能替代医师面诊。');

  if (a.mismatches.length) throw new Error(`正文与复算不一致 ${a.mismatches.length} 处：\n${a.mismatches.join('\n')}`);
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, ROOT, readJSON, readDoc, corpus, hits, hitUnion, tables, num, WORDS, analyze };

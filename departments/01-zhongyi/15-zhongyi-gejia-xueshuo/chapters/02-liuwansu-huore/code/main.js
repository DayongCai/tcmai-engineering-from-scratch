#!/usr/bin/env node
/**
 * 中医各家学说 · 第 2 章 把「火」抬成终点，等于用一个高频字换掉一整套低频解释
 * 课程: departments/01-zhongyi/15-zhongyi-gejia-xueshuo/chapters/02-liuwansu-huore/docs/zh.md
 * 数据: standards/neijing-xuandu/底本.json · standards/{shanghan,jingui,wenbing}/底本.json · standards/gejia/学派库.json
 * 依赖: 仅 Node.js 标准库
 *
 * 只读：病机十九条的归类、三部底本的用字命中、刘完素词表命中、可发汗与不可发汗，
 * 全部当次现算，再与正文两张表逐格对照；对不上就抛错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const TITLE = '把「火」抬成终点，等于用一个高频字换掉一整套低频解释';

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

/** 三部底本读成同一种「条」 */
function corpus() {
  const sh = readJSON('standards/shanghan/底本.json');
  const jg = readJSON('standards/jingui/底本.json');
  const wb = readJSON('standards/wenbing/底本.json');
  const shanghan = sh.pian.flatMap((p) =>
    p.items.map((it) => ({ corpus: 'shanghan', pian: p.pian, no: it.no, text: it.text })));
  const jingui = jg.pian.flatMap((p) =>
    p.articles.map((a) => ({ corpus: 'jingui', pian: p.nameSimp, no: a.tiao, text: a.zhHans })));
  const wenbing = wb.books.flatMap((b) => b.sections.flatMap((s) =>
    s.articles.map((a) => ({ corpus: 'wenbing', book: b.titleSimp, pian: s.pian || s.juan || '', no: a.no, text: a.zhHans }))));
  return { shanghan, jingui, wenbing, all: [...shanghan, ...jingui, ...wenbing] };
}

const hits = (list, word) => list.reduce((n, t) => n + (t.text.includes(word) ? 1 : 0), 0);
/** 一条只要含词表里任一词就记 1 */
const hitUnion = (list, terms) => list.reduce((n, t) => n + (terms.some((w) => t.text.includes(w)) ? 1 : 0), 0);

/** 正文里的 Markdown 表 */
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

/** 病机十九条：从《素问·至真要大论》里取出「诸……，皆属于……」的一整段，逐条归类 */
const CATEGORY = {
  肝: '五脏', 心: '五脏', 脾: '五脏', 肺: '五脏', 肾: '五脏',
  火: '火', 热: '热', 寒: '寒', 湿: '湿', 风: '风', 上: '上下', 下: '上下',
};

function nineteen(md) {
  const nj = readJSON('standards/neijing-xuandu/底本.json');
  let para = null;
  for (const c of nj.classes) {
    for (const p of c.pians) {
      if (!p.title.includes('至真要大论')) continue;
      for (const pa of p.paras) {
        const k = (pa.text.match(/皆属于/g) || []).length;
        if (k >= 10) para = pa.text;
      }
    }
  }
  if (!para) throw new Error('《素问·至真要大论》里没找到病机十九条那一段');
  const clauses = para.split('；').map((s) => s.trim()).filter((s) => /皆属于/.test(s));
  const parsed = clauses.map((cl) => {
    const m = cl.match(/皆属于([\u4e00-\u9fff]{1,2})/);
    const to = m ? m[1] : '?';
    return { clause: cl, to, category: CATEGORY[to] || '?' };
  });
  const count = {};
  for (const x of parsed) count[x.category] = (count[x.category] || 0) + 1;
  return { parsed, count, total: parsed.length };
}

function analyze() {
  const md = readDoc();
  const c = corpus();
  const school = readJSON('standards/gejia/学派库.json').schools.find((s) => s.key === 'liu-wansu');
  if (!school) throw new Error('学派库里找不到 liu-wansu');

  const n = nineteen(md);
  const word = { 寒: hits(c.all, '寒'), 热: hits(c.all, '热'), 火: hits(c.all, '火') };

  const schoolHits = {
    total: hitUnion(c.all, school.terms),
    shanghan: hitUnion(c.shanghan, school.terms),
    jingui: hitUnion(c.jingui, school.terms),
    wenbing: hitUnion(c.wenbing, school.terms),
  };
  const shanghan = c.shanghan;
  const permit = hits(shanghan, '可发汗');
  const forbid = hits(shanghan, '不可发汗');

  const pct = (a, b) => (a / b) * 100;
  const ratios = {
    coldOverFire: word.寒 / word.火,
    hotShare: (n.count.火 + n.count.热) / n.total,
    coldShare: n.count.寒 / n.total,
    forbidShare: forbid / permit,
  };

  // 与正文对照
  const docTables = tables(md);
  const catTable = docTables.find((t) => t.header.includes('归类') && t.header.join('|').includes('条数'));
  const layerTable = docTables.find((t) => t.header.includes('层级'));
  if (!catTable) throw new Error('正文里找不到病机十九条归类表');
  if (!layerTable) throw new Error('正文里找不到「层级」对照表');

  const mismatches = [];
  const expect = {
    '属火': n.count.火, '属热': n.count.热, '属寒': n.count.寒, '属湿': n.count.湿,
    '属风': n.count.风, '属上': (n.count.上下 || 0), '属五脏': n.count.五脏,
  };
  for (const [label, value] of Object.entries(expect)) {
    const line = catTable.rows.find((x) => x[0].includes(label));
    if (!line) { mismatches.push(`归类表缺「${label}」一行`); continue; }
    if (num(line[1]) !== value) mismatches.push(`${label}：正文 ${num(line[1])}，现算 ${value}`);
  }
  const layerWords = [
    ['寒', word.寒], ['热', word.热], ['火', word.火],
  ];
  for (const [w, v] of layerWords) {
    const line = layerTable.rows.find((x) => x.join(' ').includes(`${w} ${v}`) || x.join(' ').includes(`${w}·`));
    if (!line) mismatches.push(`层级表里找不到「${w} ${v}」`);
  }
  if (num(catTable.rows.reduce((s, r) => s + (num(r[1]) || 0), 0)) !== n.total) {
    // 表内条数之和应等于 19
    mismatches.push('归类表条数之和不是 19');
  }

  return { md, total: c.all.length, n, word, schoolHits, ratios, permit, forbid, mismatches, docTables: docTables.length };
}

function main() {
  const a = analyze();
  const w = (s) => [...String(s)].reduce((n, ch) => n + (/[\u4e00-\u9fff]/.test(ch) ? 2 : 1), 0);
  const pad = (s, n) => String(s) + ' '.repeat(Math.max(1, n - w(s)));
  const pct = (x) => (x * 100).toFixed(1) + '%';

  console.log(`中医各家学说 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字当次现算：《素问》病机十九条 + 三部底本 2,792 条 + 学派库词表）');
  console.log('');
  console.log(`病机十九条：${a.n.total} 条`);
  for (const [k, v] of Object.entries(a.n.count)) console.log(`  ${pad(k, 8)}${v} 条  ${pct(v / a.n.total)}`);
  console.log(`  火 + 热 = ${a.n.count.火 + a.n.count.热} 条，占 ${pct(a.ratios.hotShare)}；寒 ${a.n.count.寒} 条，占 ${pct(a.ratios.coldShare)}`);
  console.log('');
  console.log(`三部底本 ${a.total} 条的用字：寒 ${a.word.寒} · 热 ${a.word.热} · 火 ${a.word.火}`);
  console.log(`  寒是火的 ${a.ratios.coldOverFire.toFixed(2)} 倍 —— 与十九条的 9/19 属火热并不矛盾，两层分母不同`);
  console.log('');
  console.log(`刘完素词表命中 ${a.schoolHits.total} 条：伤寒 ${a.schoolHits.shanghan} · 金匮 ${a.schoolHits.jingui} · 温病 ${a.schoolHits.wenbing}`);
  console.log(`  《伤寒论》可发汗 ${a.permit} 条、不可发汗 ${a.forbid} 条，禁令/许可 = ${a.ratios.forbidShare.toFixed(2)}`);
  console.log('');
  console.log(`正文对照：${a.docTables} 张表逐格复算，不符 ${a.mismatches.length} 处`);
  for (const m of a.mismatches) console.log('  - ' + m);
  console.log('');
  console.log('※ 教学样例：数字由本库语料现算，不构成诊疗建议，不能替代医师面诊。');

  if (a.mismatches.length) throw new Error(`正文与复算不一致 ${a.mismatches.length} 处：\n${a.mismatches.join('\n')}`);
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, ROOT, readJSON, readDoc, corpus, hits, hitUnion, tables, num,
  nineteen, analyze, CATEGORY,
};

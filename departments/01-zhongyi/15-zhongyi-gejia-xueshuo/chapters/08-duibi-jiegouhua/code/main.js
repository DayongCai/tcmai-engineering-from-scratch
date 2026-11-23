#!/usr/bin/env node
/**
 * 中医各家学说 · 第 8 章 三个排序三个答案：一张表能算出三件事，算不出两件事
 * 课程: departments/01-zhongyi/15-zhongyi-gejia-xueshuo/chapters/08-duibi-jiegouhua/docs/zh.md
 * 数据: standards/{shanghan,jingui,wenbing}/底本.json · standards/gejia/学派库.json · standards/zhenghou/证候库.json
 * 依赖: 仅 Node.js 标准库
 *
 * 只读：八派的三列量（词表命中、证候覆盖、方源占位）与两两秩相关，
 * 全部当次现算，再与正文矩阵表、ρ 表逐格核对；对不上就抛错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const TITLE = '三个排序三个答案：一张表能算出三件事，算不出两件事';

/** n = 8 时双侧 0.05 的 Spearman 临界值（查表，不是算出来的） */
const CRITICAL_8 = 0.738;

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
const hitUnion = (list, terms) => list.reduce((n, t) => n + (terms.some((w) => t.text.includes(w)) ? 1 : 0), 0);

/** 秩 1 = 最小值；同值按出现次序排（与正文 ρ 同口径，未做并列均秩） */
function spearman(a, b) {
  const rank = (v) => {
    const r = new Array(v.length);
    v.map((_, i) => i).sort((i, j) => v[i] - v[j]).forEach((i, pos) => { r[i] = pos + 1; });
    return r;
  };
  const ra = rank(a);
  const rb = rank(b);
  const mean = (x) => x.reduce((s, y) => s + y, 0) / x.length;
  const ma = mean(ra);
  const mb = mean(rb);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i += 1) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da += (ra[i] - ma) ** 2;
    db += (rb[i] - mb) ** 2;
  }
  return num / Math.sqrt(da * db);
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
  const t = String(s == null ? '' : s).replace(/[−–—]/g, '-').replace(/[*`]/g, '').replace(/[,\s]/g, '');
  const m = t.match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
};

const LABEL = {
  'liu-wansu': '刘完素', 'zhang-congzheng': '张从正', 'li-gao': '李杲', 'zhu-zhenheng': '朱震亨',
  'zhang-jingyue': '张景岳', 'ye-tianshi': '叶天士', 'wang-qingren': '王清任', 'zhang-xichun': '张锡纯',
};

/** 每派的代表著作：方源占位按「条目里第一个书名号」归主方源，避免把合方算两次 */
const SOURCE_BOOKS = {
  'liu-wansu': ['宣明论方'],
  'zhang-congzheng': ['儒门事亲'],
  'li-gao': ['脾胃论', '东垣试效方', '内外伤辨惑论'],
  'zhu-zhenheng': ['格致余论', '丹溪心法'],
  'zhang-jingyue': ['景岳全书'],
  'ye-tianshi': ['温热经纬'],
  'wang-qingren': ['医林改错'],
  'zhang-xichun': ['医学衷中参西录'],
};

function analyze() {
  const md = readDoc();
  const list = corpus();
  const schools = readJSON('standards/gejia/学派库.json').schools;
  const zheng = readJSON('standards/zhenghou/证候库.json');
  const family = new Map(zheng.families.map((f) => [f.family, f.all]));
  const fangEntries = zheng.zheng.flatMap((z) => z.fang || []);
  const primary = (f) => { const m = String(f).match(/《([^》]+)》/); return m ? m[1] : ''; };

  const rows = schools.map((s) => {
    const books = SOURCE_BOOKS[s.key] || [];
    return {
      key: s.key,
      label: LABEL[s.key],
      hits: hitUnion(list, s.terms),
      zheng: s.families.reduce((n, f) => n + (family.get(f) || 0), 0),
      fang: fangEntries.filter((f) => books.includes(primary(f))).length,
      families: s.families,
      books,
    };
  });

  const total = list.length;
  const totalZheng = zheng.counts.zheng;
  for (const r of rows) {
    r.hitShare = r.hits / total;
    r.zhengShare = r.zheng / totalZheng;
  }

  const rhoHitZheng = spearman(rows.map((r) => r.hits), rows.map((r) => r.zheng));
  const rhoHitFang = spearman(rows.map((r) => r.hits), rows.map((r) => r.fang));
  const rhoZhengFang = spearman(rows.map((r) => r.zheng), rows.map((r) => r.fang));

  const fangTotal = fangEntries.length;
  const fangWithSrc = fangEntries.filter((f) => /《[^》]+》/.test(f)).length;

  const docTables = tables(md);
  const matrix = docTables.find((t) => t.header.includes('词表命中') && t.header.includes('方源占位'));
  const rhoTable = docTables.find((t) => t.header.join('|').includes('直读'));
  if (!matrix) throw new Error('正文里找不到 8×6 矩阵表');
  if (!rhoTable) throw new Error('正文里找不到 ρ 表');

  const mismatches = [];
  for (const r of rows) {
    const line = matrix.rows.find((x) => x[0].includes(r.label));
    if (!line) { mismatches.push(`矩阵缺 ${r.label} 一行`); continue; }
    if (num(line[1]) !== r.hits) mismatches.push(`${r.label} 词表命中：正文 ${num(line[1])}，现算 ${r.hits}`);
    if (num(line[3]) !== r.zheng) mismatches.push(`${r.label} 证候覆盖：正文 ${num(line[3])}，现算 ${r.zheng}`);
    if (num(line[5]) !== r.fang) mismatches.push(`${r.label} 方源占位：正文 ${num(line[5])}，现算 ${r.fang}`);
  }
  const pairs = [
    ['词频 ↔ 证候', rhoHitZheng], ['词频 ↔ 方源', rhoHitFang], ['证候 ↔ 方源', rhoZhengFang],
  ];
  for (const [label, value] of pairs) {
    const line = rhoTable.rows.find((x) => x[0].replace(/\s/g, '') === label.replace(/\s/g, ''));
    if (!line) { mismatches.push(`ρ 表缺「${label}」`); continue; }
    if (Math.abs((num(line[1]) || 0) - value) > 0.0006) mismatches.push(`${label}：正文 ${line[1]}，现算 ${value.toFixed(3)}`);
  }

  return {
    md, total, totalZheng, totalFamilies: zheng.counts.families, rows,
    rho: { hitZheng: rhoHitZheng, hitFang: rhoHitFang, zhengFang: rhoZhengFang },
    fangTotal, fangWithSrc, mismatches, docTables: docTables.length,
  };
}

function main() {
  const a = analyze();
  const pct = (x) => (x * 100).toFixed(1) + '%';
  const w = (s) => [...String(s)].reduce((n, ch) => n + (/[\u4e00-\u9fff]/.test(ch) ? 2 : 1), 0);
  const pad = (s, n) => String(s) + ' '.repeat(Math.max(1, n - w(s)));

  console.log(`中医各家学说 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字当次现算：2,792 条条文 + 132 证 14 族 + 370 条方源）');
  console.log('');
  console.log(`${pad('学派', 8)}${pad('词表命中', 10)}${pad('证候', 8)}${pad('方源', 8)}`);
  for (const r of a.rows) console.log(`${pad(r.label, 8)}${pad(r.hits, 10)}${pad(r.zheng, 8)}${r.fang}`);
  console.log('');
  console.log(`三条排序互不相同：词频第一 ${[...a.rows].sort((x, y) => y.hits - x.hits)[0].label}`
    + `、证候第一 ${[...a.rows].sort((x, y) => y.zheng - x.zheng)[0].label}`
    + `、方源第一 ${[...a.rows].sort((x, y) => y.fang - x.fang)[0].label}`);
  console.log('');
  console.log(`ρ(词频, 证候) = ${a.rho.hitZheng.toFixed(3)}`);
  console.log(`ρ(词频, 方源) = ${a.rho.hitFang.toFixed(3)}`);
  console.log(`ρ(证候, 方源) = ${a.rho.zhengFang.toFixed(3)}`);
  console.log(`n = 8，双侧 0.05 临界 ${CRITICAL_8}；最大的 |ρ| = ${Math.max(...Object.values(a.rho).map(Math.abs)).toFixed(3)}，未过线——三个 ρ 都只能作否定用`);
  console.log('');
  console.log(`方源条目 ${a.fangTotal} 条（带出处 ${a.fangWithSrc} 条），证候 ${a.totalZheng} 证 ${a.totalFamilies} 族`);
  console.log('');
  console.log('能算的三件：词的年龄、族的覆盖、方源的占位；算不出的两件：思想归属、高下');
  console.log('');
  console.log(`正文对照：${a.docTables} 张表逐格复算，不符 ${a.mismatches.length} 处`);
  for (const m of a.mismatches) console.log('  - ' + m);
  console.log('');
  console.log('※ 教学样例：数字由本库语料现算，不构成诊疗建议，不能替代医师面诊。');

  if (a.mismatches.length) throw new Error(`正文与复算不一致 ${a.mismatches.length} 处：\n${a.mismatches.join('\n')}`);
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, ROOT, CRITICAL_8, readJSON, readDoc, corpus, hitUnion, spearman, tables, num,
  LABEL, SOURCE_BOOKS, analyze,
};

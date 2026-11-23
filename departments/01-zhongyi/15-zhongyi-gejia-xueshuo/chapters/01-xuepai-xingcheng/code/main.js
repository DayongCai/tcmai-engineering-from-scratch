#!/usr/bin/env node
/**
 * 中医各家学说 · 第 1 章 学派不是标签，是同一个病人身上的四种不同提问
 * 课程: departments/01-zhongyi/15-zhongyi-gejia-xueshuo/chapters/01-xuepai-xingcheng/docs/zh.md
 * 数据: standards/{shanghan,jingui,wenbing}/底本.json · standards/gejia/学派库.json · standards/zhenghou/证候库.json
 * 依赖: 仅 Node.js 标准库
 *
 * 只读：不改数据、不改正文。词表命中、证候占位、秩相关全部当次现算，
 * 再与正文表格逐格对照；对不上就抛错，免得「正文一套数、脚本一套数」两头都不知道。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const TITLE = '学派不是标签，是同一个病人身上的四种不同提问';

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

/** 三部底本读成同一种「条」：语料名、篇名、条号、正文 */
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

/** 命中「条」数：一条只要含词表里任一词就记 1，不重复记 */
const hitUnion = (list, terms) => list.reduce((n, t) => n + (terms.some((w) => t.text.includes(w)) ? 1 : 0), 0);
/** 单字／单词命中条数 */
const hits = (list, word) => list.reduce((n, t) => n + (t.text.includes(word) ? 1 : 0), 0);

/** 秩 1 = 最小值；同值按出现次序排（正文的 ρ 就是这个口径，未做并列均秩） */
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

const lab = {
  'liu-wansu': '刘完素', 'zhang-congzheng': '张从正', 'li-gao': '李杲', 'zhu-zhenheng': '朱震亨',
  'zhang-jingyue': '张景岳', 'ye-tianshi': '叶天士', 'wang-qingren': '王清任', 'zhang-xichun': '张锡纯',
};

/** 全部量：语料规模、八派两个量、词龄、秩相关，外加与正文的逐格对照 */
function analyze() {
  const md = readDoc();
  const c = corpus();
  const schools = readJSON('standards/gejia/学派库.json').schools;
  const zheng = readJSON('standards/zhenghou/证候库.json');
  const family = new Map(zheng.families.map((f) => [f.family, f.all]));

  const rows = schools.map((s) => ({
    key: s.key,
    name: s.name,
    label: lab[s.key],
    terms: s.terms,
    hits: hitUnion(c.all, s.terms),
    byCorpus: {
      shanghan: hitUnion(c.shanghan, s.terms),
      jingui: hitUnion(c.jingui, s.terms),
      wenbing: hitUnion(c.wenbing, s.terms),
    },
    zheng: s.families.reduce((n, f) => n + (family.get(f) || 0), 0),
    families: s.families,
  }));

  const total = c.all.length;
  const totalZheng = zheng.counts.zheng;
  for (const r of rows) {
    r.hitShare = r.hits / total;
    r.zhengShare = r.zheng / totalZheng;
  }

  const rho = spearman(rows.map((r) => r.hits), rows.map((r) => r.zheng));

  const WORDS = ['下', '汗', '寒', '热', '火', '瘀', '痰', '中气', '真阴', '命门', '相火', '阴火', '升阳'];
  const wordHits = new Map(WORDS.map((w) => [w, hits(c.all, w)]));

  // 与正文对照：学派表（命中条 / 关联证）与词龄表（全库命中）
  const docTables = tables(md);
  const schoolTable = docTables.find((t) => t.header.join('|').includes('命中条'));
  const wordTable = docTables.find((t) => t.header.join('|').includes('全库命中'));
  if (!schoolTable || !wordTable) throw new Error('正文里找不到学派表或词龄表');

  const mismatches = [];
  for (const r of rows) {
    const line = schoolTable.rows.find((x) => x[0].includes(r.label));
    if (!line) { mismatches.push(`正文缺 ${r.label} 一行`); continue; }
    const docHit = num(line[2]);
    const docZheng = num(line[4]);
    if (docHit !== r.hits) mismatches.push(`${r.label} 命中：正文 ${docHit}，现算 ${r.hits}`);
    if (docZheng !== r.zheng) mismatches.push(`${r.label} 关联证：正文 ${docZheng}，现算 ${r.zheng}`);
  }
  for (const [w, n] of wordHits) {
    const line = wordTable.rows.find((x) => x[0] === w);
    if (!line) { mismatches.push(`词龄表缺「${w}」`); continue; }
    if (num(line[1]) !== n) mismatches.push(`「${w}」：正文 ${num(line[1])}，现算 ${n}`);
  }

  const hitMax = Math.max(...rows.map((r) => r.hits));
  const hitMin = Math.min(...rows.map((r) => r.hits));
  const zhengMax = Math.max(...rows.map((r) => r.zheng));
  const zhengMin = Math.min(...rows.map((r) => r.zheng));

  return {
    md, total, totalZheng, rows, rho, wordHits, mismatches,
    docTables: docTables.length,
    span: { hitMax, hitMin, hitRatio: hitMax / hitMin, zhengMax, zhengMin, zhengRatio: zhengMax / zhengMin },
  };
}

function main() {
  const a = analyze();
  const pct = (x) => (x * 100).toFixed(1) + '%';
  const w = (s) => [...String(s)].reduce((n, ch) => n + (/[\u4e00-\u9fff]/.test(ch) ? 2 : 1), 0);
  const pad = (s, n) => String(s) + ' '.repeat(Math.max(1, n - w(s)));

  console.log(`中医各家学说 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字当次现算：standards 三部底本 + 学派库词表 + 证候库族规模）');
  console.log('');
  console.log(`语料 ${a.total} 条 · 证候 ${a.totalZheng} 证 · 八派词表 ${a.rows.length} 套`);
  console.log('');
  console.log(`${pad('学派', 8)}${pad('词表命中', 10)}${pad('占 2,792', 10)}${pad('关联证', 8)}占 132`);
  for (const r of a.rows) {
    console.log(`${pad(r.label, 8)}${pad(r.hits, 10)}${pad(pct(r.hitShare), 10)}${pad(r.zheng, 8)}${pct(r.zhengShare)}`);
  }
  console.log('');
  console.log(`命中极值 7 ↔ ${a.span.hitMax}：相差 ${a.span.hitRatio.toFixed(1)} 倍`);
  console.log(`证候极值 ${a.span.zhengMin} ↔ ${a.span.zhengMax}：相差 ${a.span.zhengRatio.toFixed(1)} 倍`);
  console.log(`秩相关 ρ(词频, 证候) = ${a.rho.toFixed(3)}；n = 8，双侧 0.05 临界 ${CRITICAL_8} → `
    + `${Math.abs(a.rho) < CRITICAL_8 ? '未过线，只能作否定用' : '过线'}`);
  console.log('');
  console.log('词龄（命中条数，单字与双音词同一口径）：');
  console.log('  ' + [...a.wordHits].map(([w, n]) => `${w} ${n}`).join(' · '));
  console.log('');
  console.log(`正文对照：${a.docTables} 张表逐格复算，不符 ${a.mismatches.length} 处`);
  for (const m of a.mismatches) console.log('  - ' + m);
  console.log('');
  console.log('※ 教学样例：数字由本库语料现算，不构成诊疗建议，不能替代医师面诊。');

  if (a.mismatches.length) {
    throw new Error(`正文与复算不一致 ${a.mismatches.length} 处：\n${a.mismatches.join('\n')}`);
  }
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, CRITICAL_8, ROOT, readJSON, readDoc, corpus, hits, hitUnion, spearman, tables, num, analyze, lab };

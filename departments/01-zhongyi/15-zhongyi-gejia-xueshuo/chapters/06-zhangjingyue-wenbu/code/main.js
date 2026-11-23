#!/usr/bin/env node
/**
 * 中医各家学说 · 第 6 章 七个词换三十四证：0.25% 的文本命中如何占住四分之一的证候
 * 课程: departments/01-zhongyi/15-zhongyi-gejia-xueshuo/chapters/06-zhangjingyue-wenbu/docs/zh.md
 * 数据: standards/{shanghan,jingui,wenbing}/底本.json · standards/gejia/学派库.json · standards/zhenghou/证候库.json
 * 依赖: 仅 Node.js 标准库
 *
 * 只读：张景岳词表逐词与分语料命中、证候族覆盖、方源占位，
 * 全部当次现算，再与正文末表逐格核对；对不上就抛错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
const TITLE = '七个词换三十四证：0.25% 的文本命中如何占住四分之一的证候';

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
  return { shanghan, jingui, wenbing, all: [...shanghan, ...jingui, ...wenbing] };
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
  const c = corpus();
  const school = readJSON('standards/gejia/学派库.json').schools.find((s) => s.key === 'zhang-jingyue');
  if (!school) throw new Error('学派库里找不到 zhang-jingyue');
  const zheng = readJSON('standards/zhenghou/证候库.json');
  const family = new Map(zheng.families.map((f) => [f.family, f.all]));

  const perWord = new Map(school.terms.map((w) => [w, hits(c.all, w)]));
  const byCorpus = {
    shanghan: hitUnion(c.shanghan, school.terms),
    jingui: hitUnion(c.jingui, school.terms),
    wenbing: hitUnion(c.wenbing, school.terms),
  };
  const total = byCorpus.shanghan + byCorpus.jingui + byCorpus.wenbing;
  const zhengN = school.families.reduce((n, f) => n + (family.get(f) || 0), 0);
  const fangEntries = zheng.zheng.flatMap((z) => z.fang || []);
  const fangTotal = fangEntries.length;
  const fangWithSrc = fangEntries.filter((f) => /《[^》]+》/.test(f)).length;
  /** 主方源 = 条目里第一个书名号；《医宗金鉴》合《景岳全书》这类不算景岳之方 */
  const primary = (f) => { const m = String(f).match(/《([^》]+)》/); return m ? m[1] : ''; };
  const jingyueFang = fangEntries.filter((f) => primary(f) === '景岳全书').length;

  const docTables = tables(md);
  const sumTable = docTables.find((t) => t.header.includes('量') && t.header.join('|').includes('张景岳'));
  if (!sumTable) throw new Error('正文里找不到方法论总表');

  const mismatches = [];
  const expect = [
    ['词表命中', total], ['证候覆盖', zhengN], ['方源占位', jingyueFang],
  ];
  for (const [label, value] of expect) {
    const line = sumTable.rows.find((x) => x[0].includes(label));
    if (!line) { mismatches.push(`总表缺「${label}」一行`); continue; }
    if (num(line[1]) !== value) mismatches.push(`${label}：正文 ${num(line[1])}，现算 ${value}`);
  }

  return {
    md, perWord, byCorpus, total, corpusSize: c.all.length, zhengN,
    zhengShare: zhengN / zheng.counts.zheng, textShare: total / c.all.length,
    fangTotal, fangWithSrc, jingyueFang, fangShare: jingyueFang / fangTotal,
    families: school.families, familySize: new Map(school.families.map((f) => [f, family.get(f) || 0])),
    mismatches, docTables: docTables.length,
  };
}

function main() {
  const a = analyze();
  const pct = (x) => (x * 100).toFixed(1) + '%';
  const pct2 = (x) => (x * 100).toFixed(2) + '%';
  const w = (s) => [...String(s)].reduce((n, ch) => n + (/[\u4e00-\u9fff]/.test(ch) ? 2 : 1), 0);
  const pad = (s, n) => String(s) + ' '.repeat(Math.max(1, n - w(s)));

  console.log(`中医各家学说 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字当次现算：三部底本 2,792 条 + 学派库词表 + 证候库族规模与方源）');
  console.log('');
  console.log('逐词命中：' + [...a.perWord].map(([k, v]) => `${k} ${v}`).join(' · '));
  console.log(`词表合计 ${a.total} 条，占 ${a.corpusSize} 条的 ${pct2(a.textShare)}`);
  console.log(`分语料：伤寒 ${a.byCorpus.shanghan} · 金匮 ${a.byCorpus.jingui} · 温病 ${a.byCorpus.wenbing}`);
  console.log('');
  console.log(`证候挂接 ${a.families.join(' + ')} = ${a.zhengN} 证，占 132 的 ${pct(a.zhengShare)}`);
  for (const f of a.families) console.log(`  ${pad(f, 6)}${a.familySize.get(f)} 证`);
  console.log('');
  console.log(`方源：《景岳全书》${a.jingyueFang} 方 / ${a.fangTotal} 条方条 = ${pct(a.fangShare)}（带出处 ${a.fangWithSrc} 条）`);
  console.log('');
  console.log(`一句话：${a.total} 条文本命中（${pct2(a.textShare)}）撑起 ${a.zhengN} 证（${pct(a.zhengShare)}）与 ${a.jingyueFang} 方（${pct(a.fangShare)}）`);
  console.log('');
  console.log(`正文对照：${a.docTables} 张表逐格复算，不符 ${a.mismatches.length} 处`);
  for (const m of a.mismatches) console.log('  - ' + m);
  console.log('');
  console.log('※ 教学样例：数字由本库语料现算，不构成诊疗建议，不能替代医师面诊。');

  if (a.mismatches.length) throw new Error(`正文与复算不一致 ${a.mismatches.length} 处：\n${a.mismatches.join('\n')}`);
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, ROOT, readJSON, readDoc, corpus, hits, hitUnion, tables, num, analyze };

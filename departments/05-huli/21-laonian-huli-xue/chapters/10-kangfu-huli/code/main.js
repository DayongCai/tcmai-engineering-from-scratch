#!/usr/bin/env node
/**
 * 老年护理学 · 第 10 章 老年康复护理：正文自检脚本
 * 课程: departments/05-huli/21-laonian-huli-xue/chapters/10-kangfu-huli/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 不引用任何外部数据表：节数、汉字数、表格行数、关键概念的出现次数与首见节，
 * 全部由本章 docs/zh.md 现算。正文改动后重跑即得新数；手打的数字会随改稿静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '10';
const SLUG = '10-kangfu-huli';
const TITLE = '老年康复护理';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

/** 本章要求学生能指着正文说清楚的判据（必须真出现在正文里，测试会核对） */
const TERMS = [
  { term: '功能天花板', note: '目标是推到天花板，不是推到正常' },
  { term: '离床时长', note: '班班可记，不需仪器' },
  { term: '平衡', note: '五项里最容易被省略的一项' },
  { term: '完成条件', note: '记录写条件，不写「完成」' },
  { term: '停止指征', note: '三条，活动前必须告知' },
  { term: '过用', note: '四个信号，说明量超了' },
  { term: '嵌入', note: '把训练挂到每天必做的动作上' },
  { term: '能坐不躺', note: '把体位往上推一档' }
];

const loadDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');

const hanziOf = (s) => (String(s).match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function sections(doc) {
  const out = [];
  let cur = { title: '（题记与问题）', body: [] };
  for (const line of doc.split('\n')) {
    const m = /^##\s+(.+)$/.exec(line);
    if (m) {
      out.push({ title: cur.title, body: cur.body.join('\n') });
      cur = { title: m[1].trim(), body: [] };
    } else {
      cur.body.push(line);
    }
  }
  out.push({ title: cur.title, body: cur.body.join('\n') });
  return out.map((s) => ({ ...s, hanzi: hanziOf(s.body) }));
}

function stats(doc) {
  const lines = doc.split('\n');
  return {
    hanzi: hanziOf(doc),
    sections: lines.filter((l) => /^##\s/.test(l)).length,
    paras: doc.split(/\n{2,}/).filter((p) => p.trim() && !/^\|/.test(p.trim())).length,
    tableRows: lines.filter((l) => /^\|/.test(l) && !/^\|[\s|:-]+\|?$/.test(l)).length
  };
}

function termHits(doc, terms = TERMS) {
  const secs = sections(doc);
  return terms.map((t) => {
    const count = doc.split(t.term).length - 1;
    const seen = secs.find((s) => s.body.includes(t.term));
    return { ...t, count, firstSection: seen ? seen.title : null };
  });
}

/** 正文表格的数据行（去掉表头与分隔行），按出现顺序返回 */
function actionRows(doc) {
  const rows = [];
  let header = null;
  for (const line of doc.split('\n')) {
    if (!/^\|/.test(line)) { header = null; continue; }
    if (/^\|[\s|:-]+\|?$/.test(line)) continue;
    if (!header) { header = line; continue; }
    rows.push({ header, row: line });
  }
  return rows;
}

function run() {
  const doc = loadDoc();
  const s = stats(doc);
  const hits = termHits(doc);
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    stats: s,
    sectionList: sections(doc).slice(1).map((x, i) => ({ no: i + 1, title: x.title, hanzi: x.hanzi })),
    hits,
    covered: hits.filter((h) => h.count > 0).length,
    total: hits.length,
    rows: actionRows(doc).length
  };
}

function main() {
  const r = run();
  console.log(`老年护理学 · 第 ${r.chapter} 章 ${r.title}`);
  console.log(`正文：chapters/${r.slug}/docs/zh.md`);
  console.log('');
  console.log(`本章 ${r.stats.sections} 节 · ${r.stats.hanzi.toLocaleString('en-US')} 汉字 · ${r.stats.paras} 段 · 表格 ${r.stats.tableRows} 行`);
  for (const s of r.sectionList) {
    console.log(`  §${s.no} ${s.title}（${s.hanzi} 字）`);
  }
  console.log('');
  console.log(`判据落点（概念 → 出现次数 → 首见节）：${r.covered}/${r.total}`);
  for (const h of r.hits) {
    const flag = h.count > 0 ? '✓' : '✗';
    console.log(`  ${flag} ${h.term} · ${h.count} 次 · ${h.firstSection || '正文未出现'} —— ${h.note}`);
  }
  const miss = r.hits.filter((h) => h.count === 0).map((h) => h.term);
  if (miss.length) console.log(`  ! 正文缺少：${miss.join('、')} —— 先改正文，不要改这条清单`);
  console.log('');
  if (r.rows > 0) {
    console.log(`表格动作行 ${r.rows} 行：逐行对照，缺列即为缺项。`);
  } else {
    console.log('本章无表格：判据分散在各节段，按「判据落点」逐条回正文核对。');
  }
  console.log('');
  console.log('※ 数字由本章 docs/zh.md 现算，不手打；改稿后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断或分级护理依据。');
}

if (require.main === module) main();

module.exports = { CHAPTER, SLUG, TITLE, DOC, TERMS, loadDoc, sections, stats, termHits, actionRows, run };

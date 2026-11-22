#!/usr/bin/env node
/**
 * 老年护理学 · 第 1 章 老年护理学概述：正文自检脚本
 * 课程: departments/05-huli/21-laonian-huli-xue/chapters/01-gaishu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 不引用任何外部数据表：节数、汉字数、表格行数、关键概念的出现次数与首见节，
 * 全部由本章 docs/zh.md 现算。正文改动后重跑即得新数；手打的数字会随改稿静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '1';
const SLUG = '01-gaishu';
const TITLE = '老年护理学概述';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

/** 本章要求学生能指着正文说清楚的判据（必须真出现在正文里，测试会核对） */
const TERMS = [
  { term: '部分协助', note: '三档判据里最容易被写成一句「依赖」的那一档' },
  { term: 'Barthel', note: '基本自理，10 项、总分 100' },
  { term: 'Lawton', note: '工具性日常生活活动，8 项' },
  { term: '服药管理', note: 'IADL 项，ADL 独立时它可能已经掉了' },
  { term: '项目级', note: '记录口径：写到哪一项，不写整档' },
  { term: '复评', note: '评估靠时限生效，不靠一次评完' },
  { term: '剩余能力', note: '照护计划搭在这上面' },
  { term: '去标识化', note: '与脱敏不是一回事' }
];

const loadDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');

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

const hanziOf = (s) => (String(s).match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

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
  const rows = actionRows(doc);
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    stats: s,
    sectionList: sections(doc).slice(1).map((x, i) => ({ no: i + 1, title: x.title, hanzi: x.hanzi })),
    hits,
    covered: hits.filter((h) => h.count > 0).length,
    total: hits.length,
    rows: rows.length
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
  console.log(`表格动作行 ${r.rows} 行：从「工具」到「记录口径」逐行对照，缺列即为缺项。`);
  console.log('');
  console.log('※ 数字由本章 docs/zh.md 现算，不手打；改稿后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断或分级护理依据。');
}

if (require.main === module) main();

module.exports = { CHAPTER, SLUG, TITLE, DOC, TERMS, loadDoc, sections, stats, termHits, actionRows, run };

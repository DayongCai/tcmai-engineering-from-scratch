#!/usr/bin/env node
/**
 * 中医面部望诊 · 第 6 章 · 咽喉：一百零一篇里，唯一没有专章的部位
 * 课程: departments/08-wuguan/03-zhongyi-mianbu-wangzhen/chapters/06-e36/docs/zh.md
 * 底本: 《望诊遵经》101 篇（部位表依《灵枢·五色》）
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部从正文现算：各部位篇数表逐行相加、零篇的那一行、
 * 伪膜的四条特征、输出三栏、quiz 接地情况。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 6;
const SLUG = '06-e36';
const TITLE = '咽喉：一百零一篇里，唯一没有专章的部位';

/** 各表格的数据行数（不含表头与分隔行），按出现顺序 */
const TABLE_ROWS = [7];

/** 关键判据词 */
const TERMS = ['阙上', '压舌板', '喉核', '伪膜', '白喉', '会厌', '滤泡', '可达性'];

/** 每节一个探针词：第 i 个必须出现在第 i 节 */
const SECTION_PROBES = [
  '阙上者，咽喉也',
  '喉核',
  '伪膜',
  '咽反射',
  '同时记录',
  '三栏',
  '不含价值判断',
];

const GRAM = 4;

const readDoc = () => fs.readFileSync(DOC, 'utf8');

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function h2Titles(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) out.push(m[1].trim());
  }
  return out;
}

function h2Sections(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).split(/\r?\n/)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) {
      cur = { title: m[1].trim(), body: [line] };
      out.push(cur);
    } else if (cur) cur.body.push(line);
  }
  return out.map((s) => ({ title: s.title, body: s.body.join('\n') }));
}

const sectionAt = (text, i) => (h2Sections(text)[i] || { title: '', body: '' }).body;

function tableBlocks(text) {
  const blocks = [];
  let cur = null;
  for (const line of String(text).split(/\r?\n/)) {
    const s = line.trim();
    if (s.startsWith('|')) {
      if (!cur) {
        cur = [];
        blocks.push(cur);
      }
      cur.push(s);
    } else cur = null;
  }
  return blocks.map((b) => {
    const cells = b.map((r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
    return { head: cells[0] || [], rows: cells.slice(2) };
  });
}

const occurrences = (text, term) => String(text).split(term).length - 1;

function grams(text, n = GRAM) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 各部位篇数：逐行读表，并把「唇 3（＋四白 1）」这类括注拆开 */
function pieces(text) {
  const blocks = tableBlocks(text);
  const t = blocks.find((b) => b.head[0] === '部位') || { head: [], rows: [] };
  const rows = t.rows.map((r) => {
    const n = Number((/^(\d+)/.exec(String(r[1] || '').replace(/\*/g, '')) || [null, 0])[1]);
    const extra = (/＋[^0-9]*(\d+)/.exec(String(r[1] || '')) || [null, 0])[1];
    return { part: String(r[0] || '').replace(/\*/g, ''), pieces: n, extra: Number(extra), xingrong: r[2] || '', qise: r[3] || '' };
  });
  return {
    rows,
    sum: rows.reduce((a, b) => a + b.pieces, 0),
    zero: rows.filter((r) => r.pieces === 0).map((r) => r.part),
    withShape: rows.filter((r) => r.xingrong.includes('✓')).map((r) => r.part),
    withColour: rows.filter((r) => r.qise.includes('✓')).map((r) => r.part),
  };
}

/** 底本总篇数（正文自称） */
function manuscriptTotal(text) {
  const m = /共一百零一篇|一百零一篇/.exec(String(text));
  return m ? 101 : 0;
}

/** 伪膜的四条特征（一句四顿） */
function pseudomembrane(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.includes('伪膜。')) || '';
  const body = line.replace(/^\s*/, '');
  return {
    raw: body,
    features: ['灰白色', '附着', '不易擦去', '强行擦去易出血'].filter((k) => body.includes(k)),
  };
}

/** 输出三栏：看到的／听到的／问到的 */
function outputColumns(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.includes('**看到的**')) || '';
  const hits = [...line.matchAll(/\*\*([^*]+)\*\*（([^）]*)）/g)].map((m) => ({ name: m[1], content: m[2] }));
  return { columns: hits, count: hits.length };
}

/** 采集的四条不可能 + 照度量级 */
function captureLimits(text) {
  const t = String(text);
  const sec = sectionAt(t, 3);
  const items = ['咽反射', '儿童', '照度与噪声', '视角改变解剖'].filter((k) => sec.includes(k));
  const lux = /(\d+)\s*勒克斯/.exec(t);
  const degrees = /不超过腭咽弓为Ⅰ度|接近中线为Ⅲ度|两侧几乎相接为Ⅳ度/.test(t);
  return { items, lux: lux ? Number(lux[1]) : 0, degrees };
}

const presentCount = (text, terms) => terms.filter((t) => occurrences(text, t) > 0).length;

function quizSummary(quiz, text) {
  const body = grams(text);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  for (const q of qs) if (stage[q.stage] !== undefined) stage[q.stage] += 1;
  const hits = qs.filter((q) => q.stage === 'check').map((q) => {
    const right = String((q.options || [])[q.correct] || '');
    const hit = [...new Set([...grams(right)].filter((g) => body.has(g)))];
    return { question: q.question, grams: hit, correct: q.correct };
  });
  return {
    total: qs.length,
    stage,
    check: hits.length,
    grounded: hits.filter((h) => h.grams.length >= 2).length,
    hits,
    answers: qs.map((q) => q.correct),
  };
}

function analyze() {
  const text = readDoc();
  const blocks = tableBlocks(text);
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    tables: blocks.map((b) => ({ cols: b.head.length, rows: b.rows.length, first: b.head[0] || '' })),
    terms: TERMS.map((t) => ({ term: t, count: occurrences(text, t) })),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).includes(p) })),
    pieces: pieces(text),
    total: manuscriptTotal(text),
    pseudo: pseudomembrane(text),
    columns: outputColumns(text),
    limits: captureLimits(text),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医面部望诊 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`表格 ${r.tables.length} 张：`);
  r.tables.forEach((t, i) => console.log(`  #${i + 1}  ${t.rows} 行 × ${t.cols} 列  首列表头「${t.first}」`));
  console.log('');
  console.log('关键判据（出现次数）：');
  console.log('  ' + r.terms.map((x) => `${x.term} ${x.count}`).join(' · '));
  console.log('');
  console.log('小节探针：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(`部位篇数（底本自称 ${r.total} 篇）：${r.pieces.rows.map((x) => `${x.part} ${x.pieces}`).join(' · ')}`);
  console.log(`零篇的部位：${r.pieces.zero.join('、') || '（无）'}；表内篇数合计 ${r.pieces.sum}（另有四白 1 篇单列）`);
  console.log(`有「形容提纲」的部位：${r.pieces.withShape.join('、')}；有「气色条目」的部位：${r.pieces.withColour.join('、')}`);
  console.log(`伪膜特征：${r.pseudo.features.length} 条 → ${r.pseudo.features.join('、')}`);
  console.log(`输出三栏：${r.columns.columns.map((c) => `${c.name}（${c.content}）`).join(' · ')}`);
  console.log(`采集的四种不可能：${r.limits.items.length} 条 → ${r.limits.items.join('、')}；咽部照度 ${r.limits.lux} 勒克斯`);
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`
  );
  console.log(`答案位置：${r.quiz.answers.join(' / ')}`);
  console.log('');
  console.log('※ 以上数字全部由本章正文现算，改正文后重跑即可复核。');
  console.log('※ 本章为咽喉望诊的教学材料，不构成诊疗建议、诊断或治疗指导。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  h2Titles,
  h2Sections,
  sectionAt,
  tableBlocks,
  occurrences,
  grams,
  pieces,
  manuscriptTotal,
  pseudomembrane,
  outputColumns,
  captureLimits,
  presentCount,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TABLE_ROWS,
  TERMS,
  SECTION_PROBES,
};

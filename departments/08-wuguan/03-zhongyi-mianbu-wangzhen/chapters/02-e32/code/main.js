#!/usr/bin/env node
/**
 * 中医面部望诊 · 第 2 章 · 气与色：两个词，两条轴，不能合成一个数
 * 课程: departments/08-wuguan/03-zhongyi-mianbu-wangzhen/chapters/02-e32/docs/zh.md
 * 底本: 《望诊遵经·相气十法提纲》《五色分应五脏》《色以润泽为本》
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部从正文现算：汉字数、小节顺序、两张表的行列、
 * 十法五对的组合数（2^5 与 5×32）、色域与色差的量级、quiz 接地情况。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 2;
const SLUG = '02-e32';
const TITLE = '气与色：两个词，两条轴，不能合成一个数';

/** 各表格的数据行数（不含表头与分隔行），按出现顺序 */
const TABLE_ROWS = [2, 5];

/** 关键判据词：本章反复使用的术语，是正文与习题同源的最小证据 */
const TERMS = [
  '十法',
  '浮沉',
  '清浊',
  '微甚',
  '散抟',
  '泽夭',
  '润泽',
  '镜面反射',
  '偏振',
  '相对基线',
];

/** 每节一个探针词：第 i 个必须出现在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '类别（nominal）',
  '色以润泽为本',
  '灰卡',
  '显色指数',
  '0.72',
  '不给出任何面色分类',
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

/** 十法五对：取第二张表首列的五个法名，再由 2^5 推出组合数 */
function tenMethods(text) {
  const blocks = tableBlocks(text);
  const t = blocks.find((b) => b.head[0] === '法') || { rows: [] };
  const pairs = t.rows.map((r) => r[0]).filter(Boolean);
  const combos = 2 ** pairs.length;
  return { pairs, count: pairs.length, combos, grid: 5 * combos };
}

/** 正文里的色域与色差量级 */
function colourFigures(text) {
  const t = String(text);
  const col = /(\d+)\s*万种编码色/.exec(t);
  const deltas = [...t.matchAll(/ΔE(?:00)?\s*(?:≈\s*)?(\d+)(?:–|-)(\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  return { encodedColours: col ? Number(col[1]) : 0, deltas };
}

/** 润泽的三个可测量：正文一句三顿 */
function glossMetrics(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.includes('「润泽」在图像上可以拆成三个可测的量')) || '';
  const body = line.replace(/^.*三个可测的量：/, '').replace(/。$/, '');
  return {
    raw: body,
    area: body.includes('面积占比'),
    entropy: body.includes('空间分布熵'),
    variance: body.includes('局部方差'),
  };
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
    ten: tenMethods(text),
    colour: colourFigures(text),
    gloss: glossMetrics(text),
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
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(`十法：${r.ten.count} 对 → ${r.ten.pairs.join('、')}；2^${r.ten.count} = ${r.ten.combos} 种组合，5 × ${r.ten.combos} = ${r.ten.grid} 个格子`);
  console.log(`色域：8 位 sRGB ${r.colour.encodedColours} 万种编码色；正文出现的 ΔE 量级：${r.colour.deltas.map((d) => d.join('–')).join(' / ') || '—'}`);
  console.log(`润泽三量：面积占比 ${r.gloss.area ? '✓' : '✗'} · 空间分布熵 ${r.gloss.entropy ? '✓' : '✗'} · 局部方差 ${r.gloss.variance ? '✓' : '✗'}`);
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`
  );
  console.log(`答案位置：${r.quiz.answers.join(' / ')}`);
  console.log('');
  console.log('※ 以上数字全部由本章正文现算，改正文后重跑即可复核。');
  console.log('※ 本章为面色测量的教学材料，不构成诊疗建议、诊断或治疗指导。');
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
  tenMethods,
  colourFigures,
  glossMetrics,
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

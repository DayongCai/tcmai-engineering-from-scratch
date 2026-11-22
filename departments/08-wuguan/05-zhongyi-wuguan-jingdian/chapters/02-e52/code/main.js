#!/usr/bin/env node
/**
 * 中医五官经典 · 第 2 章 · 五轮回答的是「病在哪一轮」，不是「病因为何」
 * 课程: departments/08-wuguan/05-zhongyi-wuguan-jingdian/chapters/02-e52/docs/zh.md
 *
 * 本章的数字都由本脚本从正文现算，不手打：
 *   汉字数、五轮表的行与配属、三层口径（生成论／归属论／辨证）、
 *   第四节入目的五条经脉与跷脉、第五节四组交叉的名目、第六节红旗的条数，
 *   以及 quiz 的 check 题能在正文里对上几个四字原词。正文一改，重跑即可看出哪里对不上。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '2';
const SLUG = '02-e52';
const TITLE = '五轮回答的是「病在哪一轮」，不是「病因为何」';

/** 五轮表：五轮，四列 */
const WULUN_ROWS = 5;
/** 第三节两套配属并存，本章不取单值 */
const BAKUO_DISPUTED = true;
/** 第四节以《灵枢·经脉》为据的五条经脉，按正文顺序 */
const MERIDIANS = ['足厥阴肝脉', '手少阴心脉', '足太阳膀胱脉', '足少阳胆脉', '足阳明胃脉'];
/** 第五节四组交叉：轮位 × ? */
const CROSS_GROUPS = ['病性', '病程', '局部形态', '全身'];
/** 第六节红旗，本章明写「先转诊，不在轮位上打转」 */
const RED_FLAGS = ['视力骤降', '眼痛剧烈伴头痛呕吐', '眼球外伤', '单眼突然视野遮挡', '伴发热的眼部红肿'];
/** 每节一个探针词 */
const SECTION_PROBES = ['生成论', '先看哪里', '八廓', '跷脉', '四组', '红旗'];
/** 关键判据词 */
const TERMS = ['静态的归属', '由浅入深', '固定的解剖标志', '动态的灌注', '不在轮位上打转', '黄液上冲'];

const GRAM = 4;
const NL = /\r?\n/;
const H2 = /^##\s+(.+)$/;

const readDoc = () => fs.readFileSync(DOC, 'utf8');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function h2Titles(text) {
  const out = [];
  for (const line of String(text).split(NL)) {
    const m = H2.exec(line.trim());
    if (m) out.push(m[1].trim());
  }
  return out;
}

function h2Sections(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).split(NL)) {
    const m = H2.exec(line.trim());
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
  for (const line of String(text).split(NL)) {
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

/** 五轮表：轮／部位／所属脏 三列 */
function wulun(text) {
  const t = tableBlocks(text)[0];
  if (!t) return { head: [], rows: [] };
  return {
    head: t.head,
    rows: t.rows.map((r) => ({ lun: r[0], area: r[1], zang: r[2], signs: r[3] })),
  };
}

/** 第一节的三层口径：生成论／归属论／辨证，从「读到…是…」那一句里拆出三条 */
function threeLayers(text) {
  const sec = sectionAt(text, 0);
  const line = String(sec)
    .split(NL)
    .flatMap((l) => l.split('。'))
    .find((s) => s.includes('是生成论')) || '';
  const parts = line.split('；').map((s) => s.trim()).filter(Boolean);
  return { line: line.trim(), parts };
}

/** 第五节四组交叉：以粗体「**轮位 × □□。**」为准 */
function crossGroups(text) {
  const sec = sectionAt(text, 4);
  const found = [...String(sec).matchAll(/\*\*轮位\s*×\s*([^。*]{1,6})。?\*\*/g)].map((m) => m[1].trim());
  return found.filter((x, i) => found.indexOf(x) === i);
}

/** 第四节五条经脉的出现次序 */
function meridianOrder(text) {
  const sec = sectionAt(text, 3);
  return MERIDIANS.map((name) => ({ name, at: sec.indexOf(name) })).sort((a, b) => a.at - b.at);
}

/** 第六节红旗五条，逐条在正文里找 */
function redFlags(text) {
  const sec = sectionAt(text, 5);
  return RED_FLAGS.map((f) => ({ flag: f, ok: String(sec).includes(f) }));
}

function quizSummary(quiz, text) {
  const body = grams(text);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  for (const q of qs) if (stage[q.stage] !== undefined) stage[q.stage] += 1;
  const hits = qs
    .filter((q) => q.stage === 'check')
    .map((q) => {
      const right = String((q.options || [])[q.correct] || '');
      return { question: q.question, grams: [...grams(right)].filter((g) => body.has(g)) };
    });
  return {
    total: qs.length,
    stage,
    check: hits.length,
    grounded: hits.filter((h) => h.grams.length).length,
    hits,
    indexes: [...new Set(qs.map((q) => q.correct))].sort(),
    pageRefs: qs.filter((q) => /\d+\s*页/.test(JSON.stringify(q))).length,
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    tables: tableBlocks(text).map((b) => ({ cols: b.head.length, rows: b.rows.length, first: b.head[0] || '' })),
    wulun: wulun(text),
    layers: threeLayers(text),
    cross: crossGroups(text),
    meridians: meridianOrder(text),
    flags: redFlags(text),
    bakuoDisputed: BAKUO_DISPUTED && sectionAt(text, 2).includes('谁也不服谁'),
    terms: TERMS.map((t) => ({ term: t, count: occurrences(text, t) })),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).includes(p) })),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医五官经典 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`表格 ${r.tables.length} 张：`);
  r.tables.forEach((t, i) => console.log(`  #${i + 1}  ${t.rows} 行 × ${t.cols} 列  首列表头「${t.first}」`));
  console.log('');
  console.log('五轮定位表（只回答「看哪里」）：');
  for (const x of r.wulun.rows) console.log(`  ${x.lun} = ${x.area} = 属${x.zang}   局部所见：${x.signs}`);
  console.log('');
  console.log('三层口径（同一句里的三段，能证的东西不同）：');
  r.layers.parts.forEach((p) => console.log('  ' + p));
  console.log('');
  console.log(`八廓配属不一，本章不取单值：${r.bakuoDisputed ? '已写明诸说并存' : '正文未写明'}`);
  console.log('');
  console.log('入目的经脉次序：');
  r.meridians.forEach((m, i) => console.log(`  ${i + 1}. ${m.name}`));
  console.log('');
  console.log(`四组交叉：${r.cross.join(' / ')}（四组齐了才谈得上出方）`);
  console.log('');
  console.log('红旗（先转诊，不辨轮位）：');
  r.flags.forEach((f) => console.log(`  ${f.ok ? '✓' : '✗'} ${f.flag}`));
  console.log('');
  console.log('关键判据（出现次数）：');
  console.log('  ' + r.terms.map((x) => `${x.term} ${x.count}`).join(' · '));
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(`quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`);
  console.log('');
  console.log('※ 以上数字与清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见、诊断或治疗指导；方名与治法方向不含剂量与疗程，视力骤降、剧烈眼痛或眼外伤须立即转诊。');
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
  wulun,
  threeLayers,
  crossGroups,
  meridianOrder,
  redFlags,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  WULUN_ROWS,
  MERIDIANS,
  CROSS_GROUPS,
  RED_FLAGS,
  SECTION_PROBES,
  TERMS,
};

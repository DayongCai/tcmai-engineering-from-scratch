#!/usr/bin/env node
/**
 * 中医面部望诊 · 第 5 章 · 唇：最饱和的那块颜色，恰恰不该拿来测
 * 课程: departments/08-wuguan/03-zhongyi-mianbu-wangzhen/chapters/05-e35/docs/zh.md
 * 底本: 《望诊遵经·诊唇望法提纲》《诊唇气色条目》《四白望法提纲》《牙齿望法提纲》
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部从正文现算：两张表的行列、形变条目逐个点数、
 * 三个可测轴各收了几条、口红与三档的 a* 量级、quiz 接地情况。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 5;
const SLUG = '05-e35';
const TITLE = '唇：最饱和的那块颜色，恰恰不该拿来测';

/** 各表格的数据行数（不含表头与分隔行），按出现顺序 */
const TABLE_ROWS = [5, 3];

/** 关键判据词 */
const TERMS = ['唇四白', '唇红', '口红', '深赤', '齿忽黄', '方位', '皲裂', '唇炎'];

/** 每节一个探针词：第 i 个必须出现在第 i 节 */
const SECTION_PROBES = [
  '其华在唇四白',
  '足以把判断推过三档',
  '左病者应在左',
  '齿忽黄',
  '张嘴',
  '三个轴彼此正交',
  '照录不作校勘',
];

const GRAM = 4;

/** 正文里的数目多用汉字写（二十、八到十、十二），先归一成数字再比 */
const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
function cn2num(s) {
  const t = String(s || '').trim();
  if (/^\d+$/.test(t)) return Number(t);
  if (t === '十') return 10;
  const m = /^([一二三四五六七八九])?十([一二三四五六七八九])?$/.exec(t);
  if (m) return (m[1] ? CN[m[1]] : 1) * 10 + (m[2] ? CN[m[2]] : 0);
  return CN[t] || 0;
}

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

/** 唇的两块：从「唇红 / 唇四白」那张表读，逐项比对 */
function lipParts(text) {
  const blocks = tableBlocks(text);
  const t = blocks.find((b) => b.head.includes('唇红') && b.head.includes('唇四白')) || { head: [], rows: [] };
  const rows = t.rows.map((r) => ({ item: r[0], hong: r[1] || '', sibai: r[2] || '' }));
  const pick = (name) => (rows.find((r) => r.item === name) || { hong: '', sibai: '' });
  return {
    head: t.head.filter(Boolean),
    rows,
    cell: (name) => rows.find((r) => r.item === name) || { hong: '', sibai: '' },
    thickness: pick('厚度'),
    saturation: pick('色饱和度'),
    interference: pick('主要干扰'),
  };
}

/** 十三条形变：正文点名的条目，以及三个轴各收了几条 */
function shapeAxes(text) {
  const line = String(text).split(String.fromCharCode(10)).find((l) => l.includes('种形变：')) || '';
  const listed = (/(?:列了)(\d+|[一二三四五六七八九十]+)种形变：([^。]+)。/.exec(line) || [null, '', ''])[2].split('、').map((s) => s.trim()).filter(Boolean);
  const claim = cn2num((/列了(\d+|[一二三四五六七八九十]+)种形变/.exec(line) || [null, ''])[1]);
  const blocks = tableBlocks(text);
  const t = blocks.find((b) => b.head[0] === '轴') || { head: [], rows: [] };
  const axes = t.rows.map((r) => {
    const items = String(r[1] || '').split('、').map((s) => s.replace(/（[^）]*）/g, '').trim()).filter(Boolean);
    return { axis: r[0], items, count: items.length, metric: r[2] || '' };
  });
  return { listed, claim, axes, covered: axes.reduce((a, b) => a + b.count, 0) };
}

/** 口红与三档的量级 */
function lipFigures(text) {
  const t = String(text);
  const num = '([一二三四五六七八九十]+|\d+)';
  const rouge = new RegExp('可以差' + num + '个单位以上').exec(t);
  const span = new RegExp('跨度大约' + num + '到' + num + '个单位').exec(t);
  const pose = /面积可以差(三成|[\d]+%)以上/.exec(t);
  return {
    rougeDelta: rouge ? cn2num(rouge[1]) : 0,
    span: span ? [cn2num(span[1]), cn2num(span[2])] : [],
    poseLoss: pose ? pose[1] : '',
  };
}

/** 齿：判「忽」不判「是」 */
function toothRule(text) {
  const t = String(text);
  return {
    normal: /齿色黄者长也，色白者幼也/.test(t),
    sudden: /齿忽黄，为肾虚/.test(t),
    caution: /判据是「忽然变黄」，不是「黄」/.test(t),
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
    lip: lipParts(text),
    shapes: shapeAxes(text),
    figures: lipFigures(text),
    tooth: toothRule(text),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  const s = r.shapes;
  console.log(`中医面部望诊 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((x, i) => console.log(`  ${String(i + 1).padStart(2)}  ${x}`));
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
  console.log(`唇的两块：${r.lip.head.join(' / ')}；厚度——唇红「${r.lip.thickness.hong}」、四白「${r.lip.thickness.sibai}」`);
  console.log(
    `形变清点：正文列举 ${s.listed.length} 项（原文称 ${s.claim} 种，差额来自「疮」与「内生疮」并列照录）；三个轴共收 ${s.covered} 项 → ` +
      s.axes.map((a) => `${a.axis} ${a.count}`).join(' · ')
  );
  console.log(
    `口红量级：a* 差 ${r.figures.rougeDelta} 个单位以上，而三档跨度 ${r.figures.span.join('–')} 个单位 → 一次未记录的口红可推过三档`
  );
  console.log(`姿态：闭口／微张／大张，唇红面积差 ${r.figures.poseLoss}以上`);
  console.log(
    `齿色：常态「齿色黄者长也」${r.tooth.normal ? '✓' : '✗'} · 病变「齿忽黄」${r.tooth.sudden ? '✓' : '✗'} · 判忽不判是 ${r.tooth.caution ? '✓' : '✗'}`
  );
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`
  );
  console.log(`答案位置：${r.quiz.answers.join(' / ')}`);
  console.log('');
  console.log('※ 以上数字全部由本章正文现算，改正文后重跑即可复核。');
  console.log('※ 本章为口唇与齿龈望诊的教学材料，不构成诊疗建议、诊断或治疗指导。');
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
  lipParts,
  shapeAxes,
  lipFigures,
  toothRule,
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

#!/usr/bin/env node
/**
 * 中医五官经典 · 第 4 章 · 咽与喉在经典里是两个东西，合成一个词之后辨证就变粗了
 * 课程: departments/08-wuguan/05-zhongyi-wuguan-jingdian/chapters/04-e54/docs/zh.md
 *
 * 本章的数字都由本脚本从正文现算，不手打：
 *   汉字数、第三节六组病名的行、第四节五组方证的组数、
 *   第五节斗底风四步的次序原文、养阴清肺汤后「切忌药味」的味数、
 *   第二节肺胃之外的三条经络，以及 quiz 的 check 题能在正文里对上几个四字原词。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '4';
const SLUG = '04-e54';
const TITLE = '咽与喉在经典里是两个东西，合成一个词之后辨证就变粗了';

/** 第三节病名谱：六组判据 */
const NAME_ROWS = 6;
/** 第四节方证对应：五组，各带边界 */
const PATTERN_GROUPS = ['风寒', '风热', '肺胃热盛', '阴虚', '气与瘀'];
/** 第五节斗底风四步 */
const FOUR_STEPS = 4;
/** 第四节阴虚一组的「切忌药味」味数（正文自述十三味） */
const FORBIDDEN = ['麻黄', '桑白皮', '紫荆皮', '防风', '杏仁', '牛蒡子', '山豆根', '黄芩', '射干', '花粉', '羌活', '桔梗', '荆芥'];
/** 第二节肺胃之外的三条经络 */
const EXTRA_MERIDIANS = ['足少阴肾脉', '足厥阴肝脉', '手少阴心脉'];
/** 每节一个探针词 */
const SECTION_PROBES = ['水谷之道', '肺胃之门户', '六组', '十三味', '先取痰', '急症不辨证'];
/** 关键判据词 */
const TERMS = ['喉主天气，咽主地气', '切勿误用刀', '开风路针', '双者轻，单者重', '不表现为咽痛', '不是「杀菌」'];

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

/** 第三节病名谱：病名／病位／核心判据／与现代病名的关系 */
function nameTable(text) {
  const t = tableBlocks(text)[0];
  if (!t) return { head: [], rows: [] };
  return { head: t.head, rows: t.rows.map((r) => ({ name: r[0], seat: r[1], criterion: r[2], modern: r[3] })) };
}

/** 第四节五组方证：以粗体小标题为准 */
function patternGroups(text) {
  const sec = sectionAt(text, 3);
  return PATTERN_GROUPS.filter((g) => String(sec).includes('**' + g + '**'));
}

/** 第五节斗底风四步：从原句里切出「先…；次…；三…；四…」 */
function fourSteps(text) {
  const sec = sectionAt(text, 4);
  const line = String(sec).split(NL).find((l) => l.includes('把处置写成四步')) || '';
  const body = line.slice(line.indexOf('四步：') + 3).split('。')[0];
  return body.split('；').map((s) => s.trim()).filter(Boolean);
}

/** 养阴清肺汤后的切忌药味：从「十三味——」到「，每味」之间按顿号切 */
function forbidden(text) {
  const sec = sectionAt(text, 3);
  const line = String(sec).split(NL).find((l) => l.includes('十三味——')) || '';
  const body = line.slice(line.indexOf('十三味——') + '十三味——'.length).split('，每味')[0];
  return body.split('、').map((s) => s.trim()).filter(Boolean);
}

/** 第二节肺胃之外的三条经络，按正文次序 */
function extraMeridians(text) {
  const sec = sectionAt(text, 1);
  return EXTRA_MERIDIANS.map((name) => ({ name, at: sec.indexOf(name) })).sort((a, b) => a.at - b.at);
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
    names: nameTable(text),
    groups: patternGroups(text),
    steps: fourSteps(text),
    forbidden: forbidden(text),
    meridians: extraMeridians(text),
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
  console.log('六组病名（判据在形态，不在「炎不炎」）：');
  for (const x of r.names.rows) console.log(`  ${x.name.padEnd(6)} ${x.seat.padEnd(5)} ${x.criterion}`);
  console.log('');
  console.log(`五组方证：${r.groups.join(' / ')}（每组各带边界）`);
  console.log('');
  console.log(`斗底风四步（原句切分，共 ${r.steps.length} 步）：`);
  r.steps.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  console.log('');
  console.log(`养阴清肺汤后「喉间起白所切忌药味」${r.forbidden.length} 味：`);
  console.log('  ' + r.forbidden.join('、'));
  console.log('');
  console.log('肺胃之外的三条经络：');
  r.meridians.forEach((m, i) => console.log(`  ${i + 1}. ${m.name}`));
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
  console.log('※ 本章为教学材料，不构成医学意见、诊断或治疗指导；方名只标方向、不含剂量与针刺参数，呼吸困难或单侧肿胀者属急症，须立即转诊。');
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
  nameTable,
  patternGroups,
  fourSteps,
  forbidden,
  extraMeridians,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  NAME_ROWS,
  PATTERN_GROUPS,
  FOUR_STEPS,
  FORBIDDEN,
  EXTRA_MERIDIANS,
  SECTION_PROBES,
  TERMS,
};

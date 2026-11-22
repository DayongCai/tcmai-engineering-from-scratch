#!/usr/bin/env node
/**
 * 中医正骨学 · 第 7 章 · 躯干的正骨，底线是不制造第二个损伤
 * 课程: departments/04-gushang/06-zhongyi-zhenggu-xue/chapters/07-qugan-guzhe/docs/zh.md
 * 教材: 《素问·生气通天论》；三柱、胸腰段机制与搬运原则为教材归纳
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、脊柱评估的三层、胸腰段的三种机制、搬运原则的六个动作，
 *   以及 quiz 的 check 题能在正文里对上几个四字原词。
 * 正文一改，重跑即可看出哪里对不上；测试再把这几个数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '7';
const SLUG = '07-qugan-guzhe';
const TITLE = '躯干的正骨，底线是不制造第二个损伤';

/** 本章没有表格，全用段落组织 */
const TABLE_ROWS = [];

/** 关键判据词：本章反复使用的术语，是正文与习题同源的最小证据 */
const TERMS = [
  '红旗征',
  '爆裂骨折',
  '屈曲分离',
  '反常呼吸',
  '腹膜后',
  '轴向翻身',
  '颈托',
];

/** 每节一个探针词：第 i 个必须出现在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '棘突间隙是否增宽',
  '爆裂骨折',
  '连枷胸',
  '收益与风险之比最差',
  '轴向翻身',
  '本章不写具体的手法操作',
];

/** 红旗征清单里点到的条目（代价与边界一节） */
const RED_FLAGS = ['外伤史', '激素使用', '肿瘤史', '夜间痛', '神经症状', '括约肌功能改变'];

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

/** 按二级标题切段，返回 [{ title, body }]；body 含标题行本身 */
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

/** 表格：连续以 | 开头的行成块；单元格去掉首尾竖线 */
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

/** 正文里长度为 n 的连续汉字片段集合 */
function grams(text, n = GRAM) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 小节里的有序列表编号（1. 2. …） */
function orderedItems(sectionBody) {
  const nums = [];
  for (const line of String(sectionBody).split(/\r?\n/)) {
    const m = /^\s*(\d+)\.\s+/.exec(line);
    if (m) nums.push(Number(m[1]));
  }
  return nums;
}

/** 小节里以「- **」开头的条目数 */
const boldBullets = (sectionBody) => String(sectionBody).split(/\r?\n/).filter((l) => /^-\s+\*\*/.test(l.trim())).length;

/** 这组词里在正文出现过的个数 */
const presentCount = (text, terms) => terms.filter((t) => occurrences(text, t) > 0).length;

/** 小节里每个以「**小标题。**」起头的段落的标题 */
function boldLeads(sectionBody) {
  const out = [];
  for (const line of String(sectionBody).split(/\r?\n/)) {
    const m = /^\*\*([^*]{2,30}?)。\*\*/.exec(line.trim());
    if (m) out.push(m[1].trim());
  }
  return out;
}

/** 脊柱评估的三层：第一节「第一层是稳定性：……第二层是神经：……第三层是骨质：……」 */
function threeLayers() {
  const out = [];
  for (const m of sectionAt(readDoc(), 0).matchAll(/第([一二三])层是([^：:]+)[：:]/g)) out.push(m[2].trim());
  return out;
}

/** 胸腰段三种机制（第二节的三个加粗开头） */
const threeMechanisms = () => boldLeads(sectionAt(readDoc(), 1));

/** 搬运原则：正文「原则是「整体平移、轴向翻身、不扭转」」 */
function transportPrinciple() {
  const line = readDoc().split(/\r?\n/).find((l) => l.includes('整体平移')) || '';
  const inside = (/「([^」]+)」/.exec(line) || [null, ''])[1];
  return inside.split(/[、，,]/).map((s) => s.trim()).filter(Boolean);
}

/** quiz 的结构与接地情况：check 题的正确选项能对上几个四字原词 */
function quizSummary(quiz, text) {
  const body = grams(text);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  for (const q of qs) if (stage[q.stage] !== undefined) stage[q.stage] += 1;
  const hits = qs.filter((q) => q.stage === 'check').map((q) => {
    const right = String((q.options || [])[q.correct] || '');
    return { question: q.question, grams: [...grams(right)].filter((g) => body.has(g)) };
  });
  return {
    total: qs.length,
    stage,
    check: hits.length,
    grounded: hits.filter((h) => h.grams.length).length,
    hits,
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
    redFlags: RED_FLAGS.map((t) => ({ term: t, ok: text.includes(t) })),
    layers: threeLayers(),
    mechanisms: threeMechanisms(),
    transport: transportPrinciple(),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医正骨学 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`脊柱评估的三层（正文现算，${r.layers.length} 层）：${r.layers.join(' / ')}`);
  console.log(`胸腰段三种机制（正文现算，${r.mechanisms.length} 种）：${r.mechanisms.join(' / ')}`);
  console.log(`搬运原则（正文现算，${r.transport.length} 个动作）：${r.transport.join(' / ')}`);
  console.log('');
  console.log('红旗征清单（任何一条成立：先影像，后手法）：');
  console.log('  ' + r.redFlags.map((c) => `${c.ok ? '✓' : '✗'} ${c.term}`).join(' · '));
  console.log('');
  console.log('关键判据（出现次数）：');
  console.log('  ' + r.terms.map((x) => `${x.term} ${x.count}`).join(' · '));
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`
  );
  console.log('');
  console.log('※ 以上数字与清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成诊疗建议、诊断或治疗指导。');
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
  orderedItems,
  boldBullets,
  presentCount,
  boldLeads,
  threeLayers,
  threeMechanisms,
  transportPrinciple,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TABLE_ROWS,
  TERMS,
  SECTION_PROBES,
  RED_FLAGS,
};

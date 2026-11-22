#!/usr/bin/env node
/**
 * 骨伤科手法治疗学 · 第 1 章 · 手法不是力气活：四个字约束的是一组物理量
 * 课程: departments/04-gushang/08-gushang-shoufa-zhiliao/chapters/01-shoufa-jichu/docs/zh.md
 * 依据: 《医宗金鉴·正骨心法要旨·手法总论》
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   四条规范、它们各自约束的四个量、力学三要素、反应四档、适应证四类、
 *   参数之外的六样东西，以及 quiz 的 check 题能在正文里对上几个四字原词。
 * 正文一改，重跑即可看出哪里对不上；测试再把这几个结论固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '1';
const SLUG = '01-shoufa-jichu';
const TITLE = '手法不是力气活：四个字约束的是一组物理量';

/** 四条规范，按正文表格的行序读出，这里只写期望值供测试对照 */
const EXPECTED_NORMS = ['持久', '有力', '均匀', '柔和'];

/** 力学三要素，正文括号里给出的三个词 */
const EXPECTED_QUANTS = ['大小', '方向', '作用点'];

/** 每节一个探针词：第 i 个必须出现在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '四条规范',
  '第四格是时间',
  '刺激量',
  '得气',
  '先排危险',
  '参数之外',
  '不给参数',
];

const GRAM = 4;
const LINES = /\r?\n/;

const readDoc = () => fs.readFileSync(DOC, 'utf8');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function h2Titles(text) {
  const out = [];
  for (const line of String(text).split(LINES)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) out.push(m[1].trim());
  }
  return out;
}

/** 按二级标题切段，返回 [{ title, body }] */
function h2Sections(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).split(LINES)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) {
      cur = { title: m[1].trim(), body: [line] };
      out.push(cur);
    } else if (cur) cur.body.push(line);
  }
  return out.map((s) => ({ title: s.title, body: s.body.join('\n') }));
}

const sectionAt = (text, i) => (h2Sections(text)[i] || { title: '', body: '' });

/** 表格：连续以 | 开头的行成块 */
function tableBlocks(text) {
  const blocks = [];
  let cur = null;
  for (const line of String(text).split(LINES)) {
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

/** 正文里长度为 n 的连续汉字片段 */
function grams(text, n = GRAM) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 以粗体开头的段落或列表项，如「反馈闭环」「功力」；行首的「- 」可有可无 */
function boldItems(body) {
  const out = [];
  for (const line of String(body).split(LINES)) {
    const m = /^(?:-\s+)?\*\*(.+?)。?\*\*/.exec(line.trim());
    if (m) out.push(m[1].replace(/[。、，]$/, '').trim());
  }
  return out;
}

/** 四条规范：正文第一张表的数据行首列，顺序即表序 */
function fourNorms() {
  const t = tableBlocks(readDoc())[0];
  return t ? t.rows.map((r) => r[0]) : [];
}

/** 四条规范各自约束的量：正文「四条规范落在四个量上：……」一句列出的四项 */
function fourConstrained() {
  const line = readDoc().split(LINES).find((l) => l.includes('四条规范落在四个量上')) || '';
  const tail = (/四个量上[：:](.+?)。/.exec(line) || [null, ''])[1];
  return tail.split(/、/).map((s) => s.trim()).filter(Boolean);
}

/** 力学三要素：正文「力学量是三个（大小、方向、作用点）」括号内的三项 */
function threeQuants() {
  const line = readDoc().split(LINES).find((l) => l.includes('力学量是三个')) || '';
  const inner = (/力学量是三个[（(](.+?)[）)]/.exec(line) || [null, ''])[1];
  return inner.split(/、/).map((s) => s.trim()).filter(Boolean);
}

/** 反应四档：正文第二张表的数据行首列（一、二、三、四） */
function reactionTiers() {
  const t = tableBlocks(readDoc())[1];
  return t ? t.rows.map((r) => r[0]) : [];
}

/** 适应证四类：正文「手法的适用范围包括四类：……」一句列出的四项 */
function fourScopes() {
  const line = readDoc().split(LINES).find((l) => l.includes('手法的适用范围包括四类')) || '';
  const tail = (/包括四类[：:](.+?)。/.exec(line) || [null, ''])[1];
  return tail.split(/、/).map((s) => s.trim()).filter(Boolean);
}

/** 参数之外剩下的东西：正文第六节的粗体条目 */
const beyondParams = () => boldItems(sectionAt(readDoc(), 5).body);

/** quiz 结构与接地：check 题的正确选项能对上几个四字原词 */
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
    spread: new Set(qs.map((q) => q.correct)).size,
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const sections = h2Sections(text).map((s) => s.title);
  return {
    hanzi: hanzi(text),
    sections,
    norms: fourNorms(),
    constrained: fourConstrained(),
    quants: threeQuants(),
    tiers: reactionTiers(),
    scopes: fourScopes(),
    beyond: beyondParams(),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).body.includes(p) })),
    terms: ['持久', '有力', '均匀', '柔和', '得气', '刺激量', '时间'].map((t) => ({ t, n: occurrences(text, t) })),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`骨伤科手法治疗学 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`四条规范（正文表序，${r.norms.length} 条）：${r.norms.join(' / ')}`);
  console.log(`各自约束的量（${r.constrained.length} 项）：${r.constrained.join(' / ')}`);
  console.log(`力学三要素（${r.quants.length} 项）：${r.quants.join(' / ')}`);
  console.log(`四对三：${r.quants.length} 个力学量装不下 ${r.norms.length} 条规范，正文把缺的那一维写作第四格「时间」。`);
  console.log('');
  console.log(`患者反应分档（正文表序，${r.tiers.length} 档）：${r.tiers.join(' / ')}`);
  console.log('');
  console.log(`适应证（${r.scopes.length} 类）：`);
  r.scopes.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  console.log('');
  console.log(`参数之外还剩 ${r.beyond.length} 样（第六节粗体条目现算）：${r.beyond.join(' / ')}`);
  console.log('');
  console.log('关键判据（出现次数）：');
  console.log('  ' + r.terms.map((x) => `${x.t} ${x.n}`).join(' · '));
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置`
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
  boldItems,
  fourNorms,
  fourConstrained,
  threeQuants,
  reactionTiers,
  fourScopes,
  beyondParams,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  EXPECTED_NORMS,
  EXPECTED_QUANTS,
  SECTION_PROBES,
};

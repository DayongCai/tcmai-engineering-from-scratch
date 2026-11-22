#!/usr/bin/env node
/**
 * 骨伤科手法治疗学 · 第 7 章 · 松动不改位置，只改活动度：这条界划错，处方就错
 * 课程: departments/04-gushang/08-gushang-shoufa-zhiliao/chapters/07-guanjie-songdong/docs/zh.md
 * 依据: 《厘正按摩要术·卷二·立法》《素问·异法方宜论》
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   五级的名称与幅度、第五级的归属、受限的三种原因、松动的四套风险、
 *   算松开了的三条判据，以及 quiz 的 check 题能在正文里对上几个四字原词。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '7';
const SLUG = '07-guanjie-songdong';
const TITLE = '松动不改位置，只改活动度：这条界划错，处方就错';

const EXPECTED_GRADES = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'];
const EXPECTED_CAUSES = ['疼痛性保护（肌肉防御）', '关节囊挛缩', '关节内游离体或骨性阻挡'];

const SECTION_PROBES = ['活动度', '五级', '分级管剂量，摸法管靶点', '反复做多', '踩跷', '终点后移', '本章不写参数'];

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

function grams(text, n = GRAM) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function boldItems(body) {
  const out = [];
  for (const line of String(body).split(LINES)) {
    const m = /^(?:-\s+)?\*\*(.+?)。?\*\*/.exec(line.trim());
    if (!m) continue;
    const label = m[1].trim();
    if (label.endsWith('：') || label.endsWith(':')) continue;
    out.push(label.replace(/[。、，]$/, '').trim());
  }
  return out;
}

/** 五级：第一张表的数据行，首列为级别 */
function fiveGrades() {
  const t = tableBlocks(readDoc())[0];
  return t ? t.rows.map((r) => ({ level: r[0], range: r[1], position: r[2], mapping: r[3] })) : [];
}

/** 受限的三种原因：第二张表的数据行首列 */
function threeCauses() {
  const t = tableBlocks(readDoc())[1];
  return t ? t.rows.map((r) => ({ cause: r[0], feel: r[1], level: r[2], consequence: r[3] })) : [];
}

/** 算松开了的三条判据：第六节「其一、其二、其三」粗体条目 */
const threeCriteria = () => boldItems(sectionAt(readDoc(), 5).body).filter((x) => /^其[一二三]/.test(x));

/** 松动的四套风险：第四节「其一」至「其四」粗体条目 */
const fourRisks = () => boldItems(sectionAt(readDoc(), 3).body).filter((x) => /^其[一二三四]/.test(x));

/** 第五级的归属：表里最后一行「对应中医手法」列 */
function gradeFiveOwner() {
  const g = fiveGrades();
  return g.length ? g[g.length - 1].mapping : '';
}

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
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    grades: fiveGrades(),
    causes: threeCauses(),
    criteria: threeCriteria(),
    risks: fourRisks(),
    gradeFive: gradeFiveOwner(),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).body.includes(p) })),
    terms: ['终末位', '高速低幅', '关节囊', '捻法', '踩跷'].map((t) => ({ t, n: occurrences(text, t) })),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`骨伤科手法治疗学 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个 · 表格 ${tableBlocks(readDoc()).length} 张`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`五级（${r.grades.length} 级，正文表序现算）：`);
  for (const g of r.grades) console.log(`  ${g.level} · 幅度${g.range} · ${g.position} · 对应${g.mapping}`);
  console.log(`第五级归谁管：${r.gradeFive}`);
  console.log('');
  console.log('受限的三种原因（正文表序现算）：');
  for (const c of r.causes) console.log(`  ${c.cause} · 该做${c.level} · 做错${c.consequence}`);
  console.log('');
  console.log(`松动的风险（${r.risks.length} 套）：${r.risks.join(' / ')}`);
  console.log(`算松开了的判据（${r.criteria.length} 条）：${r.criteria.join(' / ')}`);
  console.log('');
  console.log('关键判据（出现次数）：' + r.terms.map((x) => `${x.t} ${x.n}`).join(' · '));
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置`
  );
  console.log('');
  console.log('※ 以上数字与清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成诊疗建议、诊断或训练建议。');
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
  fiveGrades,
  threeCauses,
  threeCriteria,
  fourRisks,
  gradeFiveOwner,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  EXPECTED_GRADES,
  EXPECTED_CAUSES,
  SECTION_PROBES,
};

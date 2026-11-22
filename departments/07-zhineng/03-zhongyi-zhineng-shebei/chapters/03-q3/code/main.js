#!/usr/bin/env node
/**
 * 中医智能设备 · 第 3 章 · 十问筛成六快：一次由「可测性」主导的裁剪
 * 课程: departments/07-zhineng/03-zhongyi-zhineng-shebei/chapters/03-q3/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的对照关系全部由本脚本从正文现算，不手打：
 *   十问十项（从题记原句读）、六快六项（从矩阵表读）、两者重叠几项、
 *   真正不用人动手的有几项、象素候证四阶、评分三条规矩、三类终点、六步工作流。
 * 正文一改，重跑即可看出哪一项对不上；测试把这些数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '3';
const SLUG = '03-q3';
const TITLE = '十问筛成六快：一次由「可测性」主导的裁剪';

const GRAM = 4;

const readDoc = () => fs.readFileSync(DOC, 'utf8');

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

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

const h2Titles = (text) => h2Sections(text).map((s) => s.title);
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

/** 题记里的十问原文（引号内），用于核实十项都出自原句 */
function motto(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.includes('MOTTO') && l.includes('「')) || '';
  return (/「(.+?)」/.exec(line) || [null, ''])[1];
}

/** 十问十项：本章用来做对照的那十件，逐项在题记原句里验证存在 */
const TEN = ['寒热', '汗', '头身', '便', '饮食', '胸', '聋', '渴', '脉色', '气味'];

/** 十问的序号数（题记里的一到十），应与 TEN 项数一致 */
function tenNumerals(text) {
  return (motto(text).match(/[一二三四五六七八九十]/g) || []).length;
}

/** 六快：矩阵表首列 */
function sixFasts(text) {
  const b = tableBlocks(text)[0];
  return b ? b.rows.map((r) => r[0]).filter(Boolean) : [];
}

/** 六快里真正不用人动手的：「只有吃（部分）、睡、警觉三项」一句现切 */
function handsFree(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.includes('不需要人动手')) || '';
  const tail = (/只有(.+?)三项/.exec(line) || [null, ''])[1];
  return tail.split(/[、，,]/).map((s) => s.trim()).filter(Boolean);
}

/** 十问里被六快接住的项（饮食、二便），按本章的对应关系判定 */
function tenCovered(text) {
  const six = sixFasts(text).join('|');
  return TEN.filter((t) => (t === '饮食' && six.includes('吃')) || (t === '便' && six.includes('拉')));
}

/** 四阶：象、素、候、证 */
function fourStages(text) {
  const tail = (/「(.+?)」四阶/.exec(text) || [null, ''])[1];
  return tail ? tail.split(/[—\-–]/).map((s) => s.trim()).filter(Boolean) : [];
}

/** 评分三条规矩：加粗的「第 N 条，……」 */
function scoringRules(text) {
  const out = [];
  for (const m of sectionAt(text, 2).matchAll(/\*\*(第[一二三四]条)[，,](.+?)。\*\*/g)) {
    out.push({ n: m[1], rule: m[2].trim() });
  }
  return out;
}

/** 三类终点：正文「要报的终点有三类」之后的加粗小标题 */
function endpoints(text) {
  const sec = sectionAt(text, 5);
  const at = sec.indexOf('要报的终点有三类');
  const tail = at >= 0 ? sec.slice(at) : sec;
  return [...tail.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1].trim()).filter(Boolean);
}

/** 六步工作流 */
function workflow(text) {
  const m = /采集\s*→\s*质控\s*→\s*特征\s*→\s*提示\s*→\s*医师复核\s*→\s*记录/.exec(text);
  return m ? m[0].split(/\s*→\s*/).map((s) => s.trim()) : [];
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
    correctIndexes: qs.map((q) => q.correct),
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const ten = TEN.map((t) => ({ term: t, inMotto: motto(text).includes(t) }));
  const covered = tenCovered(text);
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    tables: tableBlocks(text).map((b) => ({ cols: b.head.length, rows: b.rows.length })),
    ten,
    tenCount: TEN.length,
    numerals: tenNumerals(text),
    six: sixFasts(text),
    covered,
    coverage: Number(((covered.length / TEN.length) * 100).toFixed(0)),
    free: handsFree(text),
    stages: fourStages(text),
    rules: scoringRules(text),
    endpoints: endpoints(text),
    workflow: workflow(text),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医智能设备 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个 · 表 ${r.tables.length} 张`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`十问 ${r.tenCount} 项（题记序号 ${r.numerals} 个）：${r.ten.map((t) => `${t.inMotto ? '' : '✗'}${t.term}`).join(' · ')}`);
  console.log(`六快 ${r.six.length} 项：${r.six.join(' · ')}`);
  console.log(
    `重叠：${r.covered.join('、')} 共 ${r.covered.length} 项，占十问 ${r.coverage}%；` +
      `新增需求 ${r.six.length - r.covered.length} 项`
  );
  console.log(`真正不用人动手（${r.free.length} 项）：${r.free.join(' · ')}`);
  console.log('');
  console.log(`四阶：${r.stages.join(' → ')}`);
  console.log(`评分规矩（${r.rules.length} 条）：${r.rules.map((x) => x.rule).join(' / ')}`);
  console.log(`三类终点（${r.endpoints.length} 类）：${r.endpoints.join(' / ')}`);
  console.log(`工作流 ${r.workflow.length} 步：${r.workflow.join(' → ')}`);
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）` +
      ` · check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 正确项落点 ${[...new Set(r.quiz.correctIndexes)].join('/')}`
  );
  console.log('');
  console.log('※ 以上对照全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见、诊断或治疗建议；体质辨识与辨证须由执业中医师作出。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  h2Sections,
  h2Titles,
  sectionAt,
  tableBlocks,
  occurrences,
  grams,
  motto,
  tenNumerals,
  sixFasts,
  handsFree,
  tenCovered,
  fourStages,
  scoringRules,
  endpoints,
  workflow,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TEN,
};

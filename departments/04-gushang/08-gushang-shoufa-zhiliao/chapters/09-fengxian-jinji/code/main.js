#!/usr/bin/env node
/**
 * 骨伤科手法治疗学 · 第 9 章 · 手法是主动加荷：先排危险，再谈手法
 * 课程: departments/04-gushang/08-gushang-shoufa-zhiliao/chapters/09-fengxian-jinji/docs/zh.md
 * 依据: 《医宗金鉴·正骨心法要旨·手法总论》
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   三层禁忌的条数（九／五／八）、筛查的四步顺序、五条停手信号、
 *   四类意外与七步共用流程、告知的三项内容，以及 quiz 的接地情况。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '9';
const SLUG = '09-fengxian-jinji';
const TITLE = '手法是主动加荷：先排危险，再谈手法';

const EXPECTED_ORDER = ['红旗', '绝对禁忌', '相对禁忌', '可做'];
const EXPECTED_FLOW = ['识别', '立即停止', '现场处置', '不改做什么', '记录', '转介', '告知'];

const SECTION_PROBES = ['三种处置', '红旗', '整体降级', '组织突然变硬', '不改做什么', '告知', '不给发生率'];

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
    out.push(label.replace(/[。、，]$/g, '').trim());
  }
  return out;
}

/** 绝对禁忌九类：第一张表的行首列 */
function absoluteBans() {
  const t = tableBlocks(readDoc())[0];
  return t ? t.rows.map((r) => ({ kind: r[0], detail: r[1], consequence: r[2] })) : [];
}

/** 相对禁忌五类：第二张表的行首列 */
function relativeBans() {
  const t = tableBlocks(readDoc())[1];
  return t ? t.rows.map((r) => ({ case: r[0], cell: r[1], left: r[2] })) : [];
}

/** 红旗八条：第三张表的行首列 */
function redFlags() {
  const t = tableBlocks(readDoc())[2];
  return t ? t.rows.map((r) => ({ flag: r[0], ask: r[1], points: r[2], action: r[3] })) : [];
}

/** 筛查顺序：正文「红旗 → 绝对禁忌 → 相对禁忌 → 可做」 */
function screenOrder() {
  const line = readDoc().split(LINES).find((l) => l.includes('红旗 → 绝对禁忌')) || '';
  return line
    .replace(/\*/g, '')
    .replace(/^.*?红旗/, '红旗')
    .split(/→/)
    .map((s) => s.replace(/[。；;].*$/, '').trim())
    .filter(Boolean);
}

/** 五条停手信号：第四节的粗体条目 */
const stopSignals = () => boldItems(sectionAt(readDoc(), 3).body);

/** 四类意外：第五节以粗体起头的四个名称 */
function accidents() {
  return boldItems(sectionAt(readDoc(), 4).body).filter((x) => ['晕厥', '骨折', '神经血管损伤', '皮肤损伤'].includes(x));
}

/** 七步共用流程：正文「共用同一模板：……」 */
function accidentFlow() {
  const line = readDoc().split(LINES).find((l) => l.includes('共用同一模板')) || '';
  const tail = (
    /共用同一模板[：:]\*\*(.+?)。\*\*/.exec(line) ||
    /共用同一模板[：:](.+?)。/.exec(line) ||
    [null, '']
  )[1];
  return tail
    .replace(/\*/g, '')
    .split(/→/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 告知的三项内容：第六节的「其一、其二、其三」粗体条目 */
const notices = () => boldItems(sectionAt(readDoc(), 5).body).filter((x) => /^其[一二三]/.test(x));

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
    absolute: absoluteBans(),
    relative: relativeBans(),
    flags: redFlags(),
    order: screenOrder(),
    stops: stopSignals(),
    accidents: accidents(),
    flow: accidentFlow(),
    notices: notices(),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).body.includes(p) })),
    terms: ['绝对禁忌', '相对禁忌', '红旗', '停手', '告知'].map((t) => ({ t, n: occurrences(text, t) })),
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
  console.log(`三层禁忌（正文表序现算）：绝对禁忌 ${r.absolute.length} 类 · 相对禁忌 ${r.relative.length} 类 · 红旗 ${r.flags.length} 条`);
  console.log(`筛查顺序：${r.order.join(' → ')}`);
  console.log('');
  console.log(`绝对禁忌九类：${r.absolute.map((x) => x.kind).join(' / ')}`);
  console.log(`相对禁忌五类：${r.relative.map((x) => x.case).join(' / ')}`);
  console.log('');
  console.log(`停手信号（${r.stops.length} 条）：${r.stops.join(' / ')}`);
  console.log(`四类意外（${r.accidents.length} 类）：${r.accidents.join(' / ')}`);
  console.log(`共用流程（${r.flow.length} 步）：${r.flow.join(' → ')}`);
  console.log(`告知的内容（${r.notices.length} 项）：${r.notices.join(' / ')}`);
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
  console.log('※ 本章为教学材料，不构成诊疗建议、诊断或急救指导。');
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
  absoluteBans,
  relativeBans,
  redFlags,
  screenOrder,
  stopSignals,
  accidents,
  accidentFlow,
  notices,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  EXPECTED_ORDER,
  EXPECTED_FLOW,
  SECTION_PROBES,
};

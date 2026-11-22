#!/usr/bin/env node
/**
 * 骨伤科手法治疗学 · 第 4 章 · 复位不是「推回去」，是把四个方向的移位逐个消到容差以内
 * 课程: departments/04-gushang/08-gushang-shoufa-zhiliao/chapters/04-zhenggu-shoufa/docs/zh.md
 * 依据: 《医宗金鉴·正骨心法要旨·手法释义》
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   四种移位、容差表五项的让步与不让步、牵引四项、上骱三条规则、
 *   复位成功的三个体征、三种失败、不属适应证的六类，以及 quiz 的接地情况。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '4';
const SLUG = '04-zhenggu-shoufa';
const TITLE = '复位不是「推回去」，是把四个方向的移位逐个消到容差以内';

const EXPECTED_SHIFTS = ['重叠', '成角', '侧方', '旋转'];
const EXPECTED_CONCEDE = ['短缩', '侧方'];
const EXPECTED_WITHHOLD = ['旋转', '分离'];

const SECTION_PROBES = ['四种基本形式', '欲合先离', '可以让步', '顺势', '能否维持', '不给参数'];

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

/** 以粗体开头的段落或列表项；末尾带冒号的（引导句）不算条目 */
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

/** 四种移位：第一张表的数据行首列 */
function fourShifts() {
  const t = tableBlocks(readDoc())[0];
  return t ? t.rows.map((r) => ({ shift: r[0], cause: r[1], force: r[2], method: r[3] })) : [];
}

/** 容差表：第二张表的五行，功能复位列判让步与否 */
function toleranceRows() {
  const t = tableBlocks(readDoc())[1];
  if (!t) return [];
  return t.rows.map((r) => ({ item: r[0], anatomical: r[1], functional: r[2], why: r[3] }));
}

const conceded = () => toleranceRows().filter((r) => r.functional.includes('允许')).map((r) => r.item);
const withheld = () =>
  toleranceRows().filter((r) => r.functional.includes('不可让步') || r.functional === '无').map((r) => r.item);

/** 牵引四项：正文「牵引要落实四项：……」一句 */
function tractionFour() {
  const line = readDoc().split(LINES).find((l) => l.includes('牵引要落实四项')) || '';
  const tail = (/四项[：:](.+?)。/.exec(line) || [null, ''])[1];
  return tail.split(/、/).map((s) => s.trim()).filter(Boolean);
}

/** 上骱三规则：第四节里以粗体加冒号起头的三条 */
function upperRules() {
  const out = [];
  const re = /\*\*(.+?)\*\*[：:]/g;
  const body = sectionAt(readDoc(), 3).body;
  let m;
  while ((m = re.exec(body)) !== null) {
    const t = m[1].replace(/[。、，]$/, '').trim();
    if (t.length <= 8 && !out.includes(t)) out.push(t);
  }
  return out;
}

/** 复位成功的三个体征：正文「三个可查的体征：……」一句 */
function successSigns() {
  const line = readDoc().split(LINES).find((l) => l.includes('三个可查的体征')) || '';
  const tail = (/体征[：:](.+?)。/.exec(line) || [null, ''])[1];
  return tail.split(/、/).map((s) => s.trim()).filter(Boolean);
}

/** 三种失败：第五节里以「其一、其二、其三」起头的粗体条目 */
const failures = () => boldItems(sectionAt(readDoc(), 4).body).filter((x) => /^其[一二三]/.test(x));

/** 不属手法复位适应证的六类：正文「不再讨论：** ……」一句 */
function nonIndications() {
  const line = readDoc().split(LINES).find((l) => l.includes('不再讨论')) || '';
  const tail = (/不再讨论[：:]\*\*\s*(.+?)。/.exec(line) || [null, ''])[1];
  return tail.split(/、/).map((s) => s.trim()).filter(Boolean);
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
    shifts: fourShifts(),
    tolerance: toleranceRows(),
    concede: conceded(),
    withhold: withheld(),
    traction: tractionFour(),
    rules: upperRules(),
    success: successSigns(),
    fails: failures(),
    nonInd: nonIndications(),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).body.includes(p) })),
    terms: ['欲合先离', '功能复位', '解剖复位', '上骱', '骨间膜'].map((t) => ({ t, n: occurrences(text, t) })),
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
  console.log(`四种移位（${r.shifts.length} 种，正文表序现算）：`);
  for (const s of r.shifts) console.log(`  ${s.shift} · 纠正的力${s.force} · ${s.method}`);
  console.log('');
  console.log(`容差表 ${r.tolerance.length} 项：可以让步的是 ${r.concede.join('、')}；不可让步的是 ${r.withhold.join('、')}`);
  console.log(`牵引四项（${r.traction.length} 项）：${r.traction.join(' / ')}`);
  console.log(`上骱三规则（${r.rules.length} 条）：${r.rules.join(' / ')}`);
  console.log(`复位成功的体征（${r.success.length} 项）：${r.success.join(' / ')}`);
  console.log(`三种失败（${r.fails.length} 种）：${r.fails.join(' / ')}`);
  console.log(`不属手法复位适应证（${r.nonInd.length} 类）：${r.nonInd.join(' / ')}`);
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
  fourShifts,
  toleranceRows,
  conceded,
  withheld,
  tractionFour,
  upperRules,
  successSigns,
  failures,
  nonIndications,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  EXPECTED_SHIFTS,
  EXPECTED_CONCEDE,
  EXPECTED_WITHHOLD,
  SECTION_PROBES,
};

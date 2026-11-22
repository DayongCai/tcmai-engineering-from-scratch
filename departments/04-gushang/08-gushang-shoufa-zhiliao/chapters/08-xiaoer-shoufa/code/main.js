#!/usr/bin/env node
/**
 * 骨伤科手法治疗学 · 第 8 章 · 小儿的手法清单短得多，因为最薄的一层是骺板
 * 课程: departments/04-gushang/08-gushang-shoufa-zhiliao/chapters/08-xiaoer-shoufa/docs/zh.md
 * 依据: 《灵枢·逆顺肥瘦》《温病条辨·解儿难》《育婴家秘》
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   生长板四层与最弱界面、Salter-Harris 五型、生长阻滞两种形态、
 *   手法谱四个字、生理特点的三条约束，以及 quiz 的接地情况。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '8';
const SLUG = '08-xiaoer-shoufa';
const TITLE = '小儿的手法清单短得多，因为最薄的一层是骺板';

const EXPECTED_LAYERS = ['静止层', '增殖层', '肥大层', '钙化层'];
const EXPECTED_HAND = ['轻', '快', '柔', '短'];

const SECTION_PROBES = ['骨骺是否闭合', '肥大层', 'Salter-Harris', '保护骺板', '轻、快、柔', '稚阴稚阳', '本章不写参数'];

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

/** 生长板四层：正文「分四层（转述）：静止层、增殖层、肥大层、钙化层」 */
function fourLayers() {
  const line = readDoc().split(LINES).find((l) => l.includes('分四层')) || '';
  const tail = (/分四层[^：:]*[：:](.+?)。/.exec(line) || [null, ''])[1];
  return tail.split(/、/).map((s) => s.trim()).filter(Boolean);
}

/** 最弱界面：正文「最弱的一层是……——」，去掉粗体星号 */
function weakestBoundary() {
  const m = /最弱的一层是(.+?)[—]{2}/.exec(readDoc());
  return m ? m[1].replace(/\*/g, '').trim() : '';
}

/** Salter-Harris 五型：正文分型那一行里的罗马数字型别 */
function salterTypes() {
  const line = readDoc().split(LINES).find((l) => l.includes('仅骺板分离')) || '';
  const out = [];
  const re = /([ⅠⅡⅢⅣⅤ])\s*型/g;
  let m;
  while ((m = re.exec(line)) !== null) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

/** 生长阻滞两种形态：正文表的数据行首列 */
function arrestForms() {
  const t = tableBlocks(readDoc())[0];
  return t ? t.rows.map((r) => ({ form: r[0], mechanism: r[1], result: r[2], when: r[3] })) : [];
}

/** 手法谱四字：正文「概括成一句：轻、快、柔，且短」 */
function handFour() {
  const line = readDoc().split(LINES).find((l) => l.includes('概括成一句')) || '';
  const tail = (/概括成一句[：:](.+?)。/.exec(line) || [null, ''])[1];
  return String(tail)
    .replace(/且/g, '')
    .split(/[，,、]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 生理特点的三条约束：第五节「其一、其二、其三」粗体条目 */
const threeConstraints = () => boldItems(sectionAt(readDoc(), 5).body).filter((x) => /^其[一二三]/.test(x));

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
    layers: fourLayers(),
    weakest: weakestBoundary(),
    salter: salterTypes(),
    arrests: arrestForms(),
    hand: handFour(),
    constraints: threeConstraints(),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).body.includes(p) })),
    terms: ['骺板', '塑形', '稚阴稚阳', '捏脊', '生长阻滞'].map((t) => ({ t, n: occurrences(text, t) })),
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
  console.log(`生长板四层（${r.layers.length} 层）：${r.layers.join(' / ')}`);
  console.log(`最弱的界面：${r.weakest}`);
  console.log(`Salter-Harris 型别（${r.salter.length} 型）：${r.salter.join(' / ')}`);
  console.log(`生长阻滞（${r.arrests.length} 种形态）：${r.arrests.map((x) => x.form).join(' / ')}`);
  console.log(`手法谱（${r.hand.length} 个字）：${r.hand.join(' / ')}`);
  console.log(`生理约束（${r.constraints.length} 条）：${r.constraints.join(' / ')}`);
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
  console.log('※ 本章为教学材料，不构成诊疗建议、诊断或护理建议。');
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
  fourLayers,
  weakestBoundary,
  salterTypes,
  arrestForms,
  handFour,
  threeConstraints,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  EXPECTED_LAYERS,
  EXPECTED_HAND,
  SECTION_PROBES,
};

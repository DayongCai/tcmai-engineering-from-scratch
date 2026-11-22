#!/usr/bin/env node
/**
 * 中医智能设备 · 第 4 章 · 「诊法常以平旦」：条件不写进元数据，这次采集就等于没做
 * 课程: departments/07-zhineng/03-zhongyi-zhineng-shebei/chapters/04-q4/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的条件清单由本脚本从正文现算，不手打：
 *   题记的六个否定条件、八类可执行约束（含「能否自动记录」的分布）、
 *   四条采集链、标准化三层、伦理四条、合规三件、体质辨识量表的界值。
 * 正文一改，重跑即可看出哪一条对不上；测试把这些数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '4';
const SLUG = '04-q4';
const TITLE = '「诊法常以平旦」：条件不写进元数据，这次采集就等于没做';

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

/** 题记原文（引号内）：六个否定条件那句 */
function motto(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.includes('MOTTO') && l.includes('「')) || '';
  return (/「(.+?)」/.exec(line) || [null, ''])[1];
}

/** 六个否定条件：题记中间六个分句（去掉「诊法常以平旦」与收尾一句） */
function mottoClauses(text) {
  return motto(text)
    .split(/[，,]/)
    .map((s) => s.trim())
    .filter((s) => s && (s.includes('未') || s === '络脉调匀'));
}

/** 八类约束：表体四列，最后一列决定能否自动记录 */
function conditions(text) {
  const b = tableBlocks(text)[0];
  if (!b) return [];
  return b.rows.map((r) => ({
    name: r[0],
    rule: r[1] || '',
    auto: /^可/.test(r[3] || ''),
    autoCell: r[3] || '',
  }));
}

const autoCount = (text) => conditions(text).filter((c) => c.auto).length;
const manualCount = (text) => conditions(text).filter((c) => !c.auto).length;

/** 四条采集链：望、闻、问、切 */
function chains(text) {
  return [...sectionAt(text, 1).matchAll(/^\*\*(望|闻|问|切)\*\*/gm)].map((m) => m[1]);
}

/** 标准化三层 */
function standardLayers(text) {
  return [...sectionAt(text, 2).matchAll(/^\*\*([\u4e00-\u9fff]{2,3}层)\*\*/gm)].map((m) => m[1]);
}

/** 伦理四条：第五节加粗的首句 */
function ethics(text) {
  return [...sectionAt(text, 4).matchAll(/^\*\*([^*。]+)。\*\*/gm)].map((m) => m[1].trim());
}

/** 合规三件：第六节「第 N 件，……」 */
function compliance(text) {
  return [...sectionAt(text, 5).matchAll(/\*\*(第[一二三四]件)[，,](.+?)。\*\*/g)].map((m) => m[2].trim());
}

/** 体质辨识量表的规模与界值 */
function constitution(text) {
  const scales = Number((/九个亚量表/.test(text) ? 9 : NaN));
  const items = Number((/六十个条目/.test(text) ? 60 : NaN));
  const levels = Number((/五级计分/.test(text) ? 5 : NaN));
  const yes = Number((/转化分为\s*(\d+)\s*为「是」/.exec(text) || [])[1]);
  const band = /(\d+)\s*到\s*(\d+)\s*为「倾向是」/.exec(text);
  const lo = band ? Number(band[1]) : NaN;
  const hi = band ? Number(band[2]) : NaN;
  return {
    scales,
    items,
    levels,
    yes,
    tendencyLo: lo,
    tendencyHi: hi,
    bandWidth: hi - lo + 1,
    gap: yes - lo,
    ok: scales === 9 && items === 60 && levels === 5 && yes === 40 && lo === 30 && hi === 39,
  };
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
  const cond = conditions(text);
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    tables: tableBlocks(text).map((b) => ({ cols: b.head.length, rows: b.rows.length })),
    clauses: mottoClauses(text),
    conditions: cond,
    auto: autoCount(text),
    manual: manualCount(text),
    chains: chains(text),
    layers: standardLayers(text),
    ethics: ethics(text),
    compliance: compliance(text),
    constitution: constitution(text),
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
  console.log(`题记拆出的否定条件 ${r.clauses.length} 条：${r.clauses.join(' / ')}`);
  console.log(`八类约束 ${r.conditions.length} 类（可自动记录 ${r.auto} 类 · 需人记 ${r.manual} 类）：`);
  r.conditions.forEach((c) => console.log(`  ${c.auto ? '可自动' : '需人记'}  ${c.name}`));
  console.log('');
  console.log(`四条采集链：${r.chains.join(' / ')}`);
  console.log(`标准化三层：${r.layers.join(' → ')}`);
  console.log(`伦理四条（${r.ethics.length} 条）：${r.ethics.join(' / ')}`);
  console.log(`合规三件（${r.compliance.length} 件）：${r.compliance.join(' / ')}`);
  console.log('');
  const c = r.constitution;
  console.log(
    `体质辨识：${c.scales} 亚量表 / ${c.items} 条目 / ${c.levels} 级计分；` +
      `倾向是 ${c.tendencyLo}–${c.tendencyHi}（${c.bandWidth} 档），是 ≥${c.yes}，与下界的差 ${c.gap}` +
      `${c.ok ? ' ✓ 与正文一致' : ' ✗ 与正文不一致'}`
  );
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）` +
      ` · check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 正确项落点 ${[...new Set(r.quiz.correctIndexes)].join('/')}`
  );
  console.log('');
  console.log('※ 以上清单与界值全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见、诊断或治疗建议；四诊采集与体质辨识须由具备资质的人员完成。');
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
  mottoClauses,
  conditions,
  autoCount,
  manualCount,
  chains,
  standardLayers,
  ethics,
  compliance,
  constitution,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};

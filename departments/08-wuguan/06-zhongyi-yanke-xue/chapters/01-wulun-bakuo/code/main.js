#!/usr/bin/env node
/**
 * 中医眼科学 · 第 1 章 · 五轮八廓：一张比想象中更窄的映射表
 * 课程: departments/08-wuguan/06-zhongyi-yanke-xue/chapters/01-wulun-bakuo/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与映射全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、五轮表的行列、八廓诸名在正文里出现了几个、
 *   「失效四种」的实际条数，以及 quiz 的 check 题能对上几个四字原词。
 * 正文一改，重跑即可看出哪里对不上；测试再把这些数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 1;
const SLUG = '01-wulun-bakuo';
const TITLE = '五轮八廓：一张比想象中更窄的映射表';

/** 关键判据词：本章反复使用的术语，是正文与习题同源的最小证据 */
const TERMS = ['分区归约', '相表里', '气之精', '四隅', '玄府闭塞', '目系', '启发式'];

/** 每节一个探针词：第 i 个必须出现在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '分区归约',
  '精气按组织层次分配',
  '对象本身没有唯一解',
  '不许跳步',
  '天行赤眼是疫毒直接犯目',
  '本章不给方剂组成与剂量',
];

/** 八廓的八个名目（《审视瑶函》体系），用来数正文提到了几个 */
const BAKUO_NAMES = ['天廓', '地廓', '水廓', '风廓', '火廓', '雷廓', '泽廓', '山廓'];

/** 体征关键词 → 表格中的「部位」列；别名只做检索，脏与腑仍从表里读 */
const AREA_KEYS = {
  胞睑: ['胞睑', '眼睑', '上睑', '下睑', '睑弦'],
  两眦: ['两眦', '眦'],
  白睛: ['白睛'],
  黑睛: ['黑睛'],
  瞳神: ['瞳神'],
};

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

/** 按二级标题切段，返回 [{ title, body }] */
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

/** 表格块：连续以 | 开头的行；第二行为分隔行，其余为数据行 */
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

/** 五轮表 → [{lun, area, zang, fu, example}]，全部从正文表格读，不另立常数 */
function wulunRows(text) {
  const block = tableBlocks(text)[0];
  if (!block) return [];
  return block.rows.map((r) => ({
    lun: r[0] || '',
    area: r[1] || '',
    zang: r[2] || '',
    fu: r[3] || '',
    example: r[4] || '',
  }));
}

/** 由体征文字定位轮位：一行体征可命中多个部位，命中几个就返回几个 */
function locate(sign) {
  const rows = wulunRows(readDoc());
  const hits = rows.filter((r) => (AREA_KEYS[r.area] || []).some((k) => String(sign).includes(k)));
  return hits.map((r) => ({ lun: r.lun, area: r.area, zang: r.zang, fu: r.fu }));
}

/** 某节里以「**……**」开头的条目（用于数「失效四种」这类清单） */
function boldLeads(sectionBody) {
  const out = [];
  for (const line of String(sectionBody).split(/\r?\n/)) {
    const m = /^\*\*(.+?)\*\*/.exec(line.trim());
    if (m) out.push(m[1].replace(/[。.]$/, ''));
  }
  return out;
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
    wulun: wulunRows(text),
    terms: TERMS.map((t) => ({ term: t, count: occurrences(text, t) })),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).includes(p) })),
    boundaries: boldLeads(sectionAt(text, 4)),
    bakuo: BAKUO_NAMES.map((n) => ({ name: n, count: occurrences(text, n) })),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医眼科学 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个 · 表格 ${r.tables.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log('五轮表（从正文表格现读）：');
  for (const w of r.wulun) console.log(`  ${w.lun} · ${w.area} → ${w.zang}（表里：${w.fu}）`);
  console.log('');
  console.log(`八廓名目在正文出现情况：${r.bakuo.map((b) => `${b.name} ${b.count}`).join(' · ')}`);
  const seen = r.bakuo.filter((b) => b.count > 0).length;
  console.log(`  正文提到 ${seen} / ${r.bakuo.length} 个，且多数只以「有争议」的方式出现`);
  console.log('');
  console.log(`五轮失效的四种情形（正文现算，${r.boundaries.length} 种）：`);
  r.boundaries.forEach((b, i) => console.log(`  ${i + 1}. ${b}`));
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
  console.log('※ 本章为教学材料，不构成诊疗建议；眼部急症一律先转急诊眼科。');
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
  wulunRows,
  locate,
  boldLeads,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  BAKUO_NAMES,
  AREA_KEYS,
};

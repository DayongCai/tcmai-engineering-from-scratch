#!/usr/bin/env node
/**
 * 骨伤科手法治疗学 · 第 6 章 · 腰腿痛有一半时间在做鉴别，鉴别没做完就不动手
 * 课程: departments/04-gushang/08-gushang-shoufa-zhiliao/chapters/06-yaotui/docs/zh.md
 * 依据: 《素问·脉要精微论》
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   六种常见腰痛、急性与慢性的五个对比项、腿痛的四种来源、四条红旗，
 *   以及 quiz 的 check 题能在正文里对上几个四字原词。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '6';
const SLUG = '06-yaotui';
const TITLE = '腰腿痛有一半时间在做鉴别，鉴别没做完就不动手';

const EXPECTED_DISEASES = ['腰肌劳损', '小关节紊乱', '第三腰椎横突综合征', '急性腰扭伤', '腰椎间盘突出症', '腰椎管狭窄症'];
const EXPECTED_RED_FLAGS = ['夜间静息痛、体重下降、肿瘤史', '发热、局部红肿热、脊柱叩击痛', '鞍区麻木、二便无力或失禁', '进行性下肢无力、足下垂'];

const SECTION_PROBES = ['压痛弥散', '即刻', '只松不整', '同一个腰', '收功', '腰腿同源', '红旗', '不写手法参数'];

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

/** 六种常见腰痛：第一张表的数据行首列 */
function sixDiseases() {
  const t = tableBlocks(readDoc())[0];
  return t ? t.rows.map((r) => ({ name: r[0], point: r[1], radiation: r[2], test: r[3], role: r[4] })) : [];
}

/** 急性腰扭伤与腰肌劳损的对比：第二张表的行首列，共五项 */
function acuteVsChronic() {
  const t = tableBlocks(readDoc())[1];
  return t ? t.rows.map((r) => ({ item: r[0], acute: r[1], chronic: r[2] })) : [];
}

/** 四条红旗：第三张表的数据行 */
function redFlags() {
  const t = tableBlocks(readDoc())[2];
  return t ? t.rows.map((r) => ({ flag: r[0], ask: r[1], points: r[2] })) : [];
}

/** 腿痛的四种来源：第六节的粗体条目 */
const legSources = () => boldItems(sectionAt(readDoc(), 5).body);

/** 收功的手法内容：第五节「轻揉、掌摩、抚法与擦法」 */
function closingMethods() {
  const line = readDoc().split(LINES).find((l) => l.includes('整理手法的内容是固定的几样')) || '';
  const tail = (/几样[：:](.+?)[，,]/.exec(line) || [null, ''])[1];
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
    diseases: sixDiseases(),
    compare: acuteVsChronic(),
    flags: redFlags(),
    legs: legSources(),
    closing: closingMethods(),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).body.includes(p) })),
    terms: ['即刻缓解', '只松不整', '间歇性跛行', '直腿抬高', '收功'].map((t) => ({ t, n: occurrences(text, t) })),
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
  console.log(`六种常见腰痛（${r.diseases.length} 种，正文表序现算）：`);
  for (const d of r.diseases) console.log(`  ${d.name} · 压痛${d.point} · ${d.role}`);
  console.log('');
  console.log(`急性与慢性的对比（${r.compare.length} 项）：${r.compare.map((x) => x.item).join(' / ')}`);
  console.log(`腿痛的来源（${r.legs.length} 种）：${r.legs.join(' / ')}`);
  console.log(`收功的内容（${r.closing.length} 样）：${r.closing.join(' / ')}`);
  console.log('');
  console.log(`四条红旗（${r.flags.length} 条，含最快问出它的那句话）：`);
  r.flags.forEach((f, i) => console.log(`  ${i + 1}. ${f.flag} —— ${f.ask}`));
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
  sixDiseases,
  acuteVsChronic,
  redFlags,
  legSources,
  closingMethods,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  EXPECTED_DISEASES,
  EXPECTED_RED_FLAGS,
  SECTION_PROBES,
};

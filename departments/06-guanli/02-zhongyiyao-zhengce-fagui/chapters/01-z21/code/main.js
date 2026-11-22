#!/usr/bin/env node
/**
 * 中医药政策法规 · 第 1 章 · 一条规矩四个层级：中医药法的效力从哪里来
 * 课程: departments/06-guanli/02-zhongyiyao-zhengce-fagui/chapters/01-z21/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的清单与计数全部由本脚本从正文现算，不手打：
 *   四个层级、四条冲突规则、判据三问、政策动词的出现次数，
 *   以及 quiz 的 check 题能在正文里对上几个四字原词。
 * 正文一改，重跑即可看出哪一行对不上；测试再把结论固定下来。
 *
 * 口径：汉字按 Unicode 汉字块计；表格按「连续以 | 开头的行」切块，跳过表头与分隔行。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '1';
const SLUG = '01-z21';
const TITLE = '一条规矩四个层级：中医药法的效力从哪里来';

/** 四个层级，正文第一张表首列，顺序即表序 */
const EXPECTED_LAYERS = ['法律', '行政法规', '部门规章', '规范性文件与技术标准'];

/** 判据三问，正文第五节的三条粗体 */
const EXPECTED_QUESTIONS = ['谁应当', '应当做什么', '不做怎样'];

/** 每节一个探针词：第 i 个必须出现在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '效力与具体度成反比',
  '下位规范不能给公民增设',
  '申报人对材料真实性自负其责',
  '特别规定优先',
  '不做怎样',
  '本章不引具体条文序号与法规全称',
];

/** 正文说政策文件里大量出现的四个动词 */
const POLICY_VERBS = ['鼓励', '支持', '探索', '推动'];

const GRAM = 4;
const LINES = /\r?\n/;

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const occurrences = (text, term) => String(text).split(term).length - 1;

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

/** 表格：连续以 | 开头的行成块；head 为首行，rows 跳过表头与分隔行 */
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

/** 正文里长度为 n 的连续汉字片段 */
function grams(text, n = GRAM) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 以粗体开头的段落或列表项；行首的「- 」可有可无 */
function boldItems(body) {
  const out = [];
  for (const line of String(body).split(LINES)) {
    const m = /^(?:-\s+)?\*\*(.+?)。?\*\*/.exec(line.trim());
    if (m) out.push(m[1].replace(/[。、，]$/, '').trim());
  }
  return out;
}

/** 四个层级：正文第一张表的数据行首列 */
function fourLayers() {
  const t = tableBlocks(readDoc())[0];
  return t ? t.rows.map((r) => r[0]) : [];
}

/** 四层各自的语言特征：同一张表的第四列，用来说明「四种语言」 */
function layerLanguages() {
  const t = tableBlocks(readDoc())[0];
  return t ? t.rows.map((r) => r[3]) : [];
}

/** 冲突规则：正文第二张表的四行，取「适用规则」一列 */
function conflictRules() {
  const t = tableBlocks(readDoc())[1];
  return t ? t.rows.map((r) => r[1]) : [];
}

/** 判据三问：第五节的三条粗体，去掉问号 */
const threeQuestions = () => boldItems(sectionAt(readDoc(), 4).body).map((s) => s.replace(/[？?]/g, ''));

/** 政策动词：正文说它们大量落在「宣示」这一类的那些词 */
const policyVerbCounts = () => POLICY_VERBS.map((t) => ({ t, n: occurrences(readDoc(), t) }));

/** quiz 结构与接地：check 题的正确选项能对上几个四字原词 */
function quizSummary(quiz, text) {
  const body = grams(text);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  for (const q of qs) if (stage[q.stage] !== undefined) stage[q.stage] += 1;
  const hits = qs
    .filter((q) => q.stage === 'check')
    .map((q) => {
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
    minExplain: Math.min(...qs.map((q) => hanzi(q.explain))),
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    layers: fourLayers(),
    languages: layerLanguages(),
    rules: conflictRules(),
    questions: threeQuestions(),
    verbs: policyVerbCounts(),
    tableView: /效力与具体度成反比/.test(text),
    chainView: /上位规范授权，下位规范细化/.test(text),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).body.includes(p) })),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医药政策法规 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`四层规范（正文表序，${r.layers.length} 层）：${r.layers.join(' / ')}`);
  r.layers.forEach((l, i) => console.log(`  ${l} → 语言：${r.languages[i]}`));
  console.log('');
  console.log(`冲突规则（正文表序，${r.rules.length} 条）：`);
  r.rules.forEach((x, i) => console.log(`  ${i + 1}. ${x}`));
  console.log(`  末条是否回到授权与立法目的：${r.rules.some((x) => x.includes('裁决')) ? '是' : '否'}`);
  console.log('');
  console.log(`判据三问（第五节粗体，${r.questions.length} 问）：${r.questions.join(' / ')}`);
  console.log(`政策动词（全章出现次数）：${r.verbs.map((v) => `${v.t} ${v.n}`).join(' · ')}`);
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置 · 最短解释 ${r.quiz.minExplain} 汉字`
  );
  console.log('');
  console.log('※ 以上清单与次数全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，讨论规范的层级与适用方法，不构成法律意见。');
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
  layerLanguages,
  conflictRules,
  threeQuestions,
  policyVerbCounts,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  EXPECTED_LAYERS,
  EXPECTED_QUESTIONS,
  POLICY_VERBS,
  SECTION_PROBES,
};

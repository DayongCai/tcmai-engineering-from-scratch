'use strict';
/**
 * 中医 · 第 4 章 脱敏不是删名字：可识别性藏在方剂与病程里
 *
 *   node code/main.js
 *
 * 正文：chapters/04-ai4/docs/zh.md
 * 习题：chapters/04-ai4/quiz.json
 *
 * 本章没有外部语料，所有数字都从正文本身现算：
 *   · 分节数、各节汉字数、全章汉字数
 *   · 本章判据在正文里的出现次数（缺一条即报错）
 *   · quiz 的结构（题数 / 段位 / 选项 / 解释字数 / 答案分布）
 *   · quiz 的 check 题正确选项是否真的能在正文里找到原词
 * 正文或题目一改，重跑就能看出是哪一条对不上。
 *
 * 依赖：仅 Node.js 标准库。
 */

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const CHAPTER = 4;
const SLUG = '04-ai4';
const TITLE = '脱敏不是删名字：可识别性藏在方剂与病程里';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s || '').match(HANZI) || []).length;
const count = (text, term) => String(text).split(term).length - 1;

/** 4 字连续汉字片段：判断一道题的正确选项是否真的落在正文里 */
function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/* ── 正文 ────────────────────────────────────────────────────────── */

function parseDoc(doc = fs.readFileSync(DOC, 'utf8')) {
  const lines = String(doc).split(/\r?\n/);
  const title = (lines[0] || '').replace(/^#\s*/, '').trim();
  const motto = /^>\s*\*\*MOTTO:\*\*\s*「([^」]+)」——《([^》]+)》/m.exec(doc);
  const sections = [];
  let cur = null;
  for (const line of lines) {
    const h = /^##\s+(.+?)\s*$/.exec(line);
    if (h) {
      cur = { heading: h[1], lines: [] };
      sections.push(cur);
      continue;
    }
    if (cur) cur.lines.push(line);
  }
  return {
    title,
    motto: { text: motto ? motto[1] : '', source: motto ? motto[2] : '' },
    hanzi: hanzi(doc),
    sections: sections.map((s) => ({
      heading: s.heading,
      body: s.lines.join('\n'),
      hanzi: hanzi(s.lines.join('\n')),
    })),
  };
}

/**
 * 本章判据清单。每条都要在正文里找到原话；找不到说明正文没讲，
 * 或者代码记的是旧版说法 —— 两种情况都必须报错。
 */
const CLAIMS = [
  { id: 'two-ids', label: '两类标识符', terms: ['直接标识符', '准标识符'] },
  { id: 'combo', label: '组合唯一性', terms: ['组合', '唯一性'] },
  { id: 'order', label: '先结构化、再泛化、最后人工复核', terms: ['先结构化', '再泛化', '人工复核'] },
  { id: 'three-words', label: '脱敏 / 去标识化 / 匿名化', terms: ['去标识化', '匿名化'] },
  { id: 'default-rule', label: '脱敏后仍属个人信息的默认假设', terms: ['脱敏后仍属个人信息'] },
  { id: 'four-layers', label: '分层出域四层', terms: ['汇总统计', '抽样明细', '受控环境', '原始数据'] },
  { id: 'three-checks', label: '再识别风险三检查', terms: ['最小的组', '外部有多少可以对接的数据', '模型会不会记住样本'] },
];

/* ── quiz ────────────────────────────────────────────────────────── */

function quizSummary(quiz, doc) {
  const body = grams(doc);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const items = qs.map((q) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    const hit = [...grams(right)].filter((g) => body.has(g));
    return {
      stage: q.stage,
      options: opts.length,
      correct: q.correct,
      explainHanzi: hanzi(q.explain),
      grounded: hit.length,
      right,
    };
  });
  return {
    total: qs.length,
    stage,
    items,
    answers: qs.map((q) => q.correct),
    distinctAnswers: new Set(qs.map((q) => q.correct)).size,
    checkGrounded: items.filter((x) => x.stage === 'check' && x.grounded > 0).length,
    minExplain: items.length ? Math.min(...items.map((x) => x.explainHanzi)) : 0,
    allFourOptions: items.every((x) => x.options === 4),
    badCorrect: items.filter((x) => !(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4)).length,
  };
}

/* ── 断言 ────────────────────────────────────────────────────────── */

function analyze() {
  const raw = fs.readFileSync(DOC, 'utf8');
  const doc = parseDoc(raw);
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const body = doc.sections.map((s) => s.body).join('\n');
  const claims = CLAIMS.map((c) => {
    const hits = c.terms.map((t) => ({ term: t, n: count(body, t) }));
    return { ...c, hits, ok: hits.every((h) => h.n > 0) };
  });
  return { doc, claims, quiz: quizSummary(quiz, raw) };
}

/** 任何一条不成立就抛错：习题与正文同源的门，靠这个函数而不是靠人眼 */
function assertChapter() {
  const r = analyze();
  const bad = [];
  for (const c of r.claims) if (!c.ok) bad.push(`正文缺判据 ${c.id}：${c.hits.filter((h) => !h.n).map((h) => h.term).join('、')}`);
  if (r.doc.sections.length < 4) bad.push(`分节过少：${r.doc.sections.length}`);
  if (r.doc.hanzi < 2500) bad.push(`正文过短：${r.doc.hanzi} 汉字`);
  const q = r.quiz;
  if (q.total < 5) bad.push(`题数不足：${q.total}`);
  for (const s of ['pre', 'check', 'post']) if (!q.stage[s]) bad.push(`缺 ${s} 段`);
  if (!q.allFourOptions) bad.push('有题不是 4 选项');
  if (q.badCorrect) bad.push('correct 下标非法');
  if (q.minExplain < 30) bad.push(`有题解释过短：${q.minExplain} 汉字`);
  if (q.checkGrounded < 2) bad.push(`check 题接地不足：${q.checkGrounded}`);
  if (q.distinctAnswers < 3) bad.push(`答案分布过窄：${q.answers.join('/')}`);
  if (bad.length) throw new Error('第 4 章不通过：\n  - ' + bad.join('\n  - '));
  return r;
}

/* ── 输出 ────────────────────────────────────────────────────────── */

function main() {
  const r = assertChapter();
  console.log(`中医 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log(`正文 ${r.doc.hanzi.toLocaleString('en-US')} 汉字 · 分节 ${r.doc.sections.length} · 题 ${r.quiz.total}`);
  console.log('');
  console.log('分节：');
  for (const s of r.doc.sections) console.log(`  ${s.heading}（${s.hanzi} 字）`);
  console.log('');
  console.log('判据在正文里的出现次数：');
  for (const c of r.claims) {
    console.log(`  ${c.ok ? '✓' : '✗'} ${c.label}：${c.hits.map((h) => `${h.term}×${h.n}`).join('、')}`);
  }
  console.log('');
  console.log(`quiz：pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post} · 答案 ${r.quiz.answers.join('/')} · check 接地 ${r.quiz.checkGrounded} 道`);
  console.log('※ 数字由正文与 quiz 现算；正文改一句，重跑即可看出哪条判据失配。');
  console.log('※ 本章为教学材料，不构成合规意见或医学建议。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  assertChapter,
  parseDoc,
  quizSummary,
  grams,
  hanzi,
  count,
  CLAIMS,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};

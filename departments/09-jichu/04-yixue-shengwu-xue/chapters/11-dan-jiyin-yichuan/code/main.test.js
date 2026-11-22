'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const {
  readDoc, sections, hanzi, punnett, binomial, familyRisks, claimCheck, modeTable,
  deviationTable, mechanismTable, pedigreeClues, missing, boundaries, summarize,
  CHAPTER, SLUG,
} = require('./main.js');

const doc = readDoc();
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const body = shingles(doc);

test('正文可读，分节含「代价与边界」', () => {
  const s = sections();
  assert.ok(s.length >= 5, '分节过少：' + s.length);
  assert.ok(s.includes('代价与边界'), '缺少「代价与边界」一节');
});

test('庞纳特方格给出 1∶2∶1 与 3∶1', () => {
  const p = punnett();
  assert.strictEqual(p.cells, 4);
  assert.strictEqual(p.genotypes.AA, 0.25);
  assert.strictEqual(p.genotypes.Aa, 0.5);
  assert.strictEqual(p.genotypes.aa, 0.25);
  assert.strictEqual(p.dominantRatio, 0.75);
  assert.strictEqual(p.recessiveRatio, 0.25);
});

test('二项分布：恰好一个 42.2%、至少一个 68.4%、一个都不病 31.6%', () => {
  const r = familyRisks(4, 0.25);
  assert.ok(Math.abs(r.exactlyOne - 0.421875) < 1e-9);
  assert.ok(Math.abs(r.atLeastOne - 0.68359375) < 1e-9);
  assert.ok(Math.abs(r.none - 0.31640625) < 1e-9);
  assert.ok(Math.abs(binomial(4, 0.25, 2) - 0.2109375) < 1e-9);
});

test('正文口径 42% 与 68% 能与现算对上', () => {
  const c = claimCheck();
  assert.strictEqual(c.quarter, true);
  assert.strictEqual(c.exactlyPct, 42);
  assert.strictEqual(c.atLeastPct, 68);
  const r = familyRisks(4, 0.25);
  assert.strictEqual(Math.round(r.exactlyOne * 100), c.exactlyPct);
  assert.strictEqual(Math.round(r.atLeastOne * 100), c.atLeastPct);
});

test('三张表：传递方式 5 种、偏离原因 6 类、机制 4 档', () => {
  const m = modeTable();
  assert.ok(m, '没读到传递方式表');
  assert.strictEqual(m.rows.length, 5, '传递方式不是 5 种：' + m.rows.length);
  assert.strictEqual(m.rows[0][0], '常染色体显性');
  const d = deviationTable();
  assert.ok(d, '没读到偏离原因表');
  assert.strictEqual(d.rows.length, 6, '偏离原因不是 6 类：' + d.rows.length);
  const k = mechanismTable();
  assert.ok(k, '没读到机制表');
  assert.strictEqual(k.rows.length, 4, '机制不是 4 档：' + k.rows.length);
});

test('系谱只给三条线索', () => {
  const c = pedigreeClues();
  assert.strictEqual(c.length, 3, '线索不是 3 条：' + c.length);
  assert.deepStrictEqual(c, ['代际形态', '性别分布', '血缘关系']);
});

test('判据词全部能在正文找到', () => {
  assert.deepStrictEqual(missing(), [], '正文缺失判据词：' + missing().join('、'));
});

test('边界声明至少三条，且标明 42%/68% 为演算', () => {
  const b = boundaries();
  assert.ok(b.length >= 3, '边界条目过少：' + b.length);
  assert.ok(b.some((x) => /演算/.test(x) && /二项分布/.test(x)), '边界未交代二项分布演算');
});

test('quiz 结构齐：题数、分段、选项与下标', () => {
  const qs = quiz.questions;
  assert.ok(Array.isArray(qs) && qs.length >= 5, '题数不足：' + qs.length);
  assert.strictEqual(String(quiz.chapter), String(CHAPTER));
  const stages = new Set(qs.map((q) => q.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), '缺 ' + s + ' 段');
  for (const q of qs) {
    assert.strictEqual(q.options.length, 4, '不是 4 选项：' + q.question);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, '下标非法：' + q.question);
  }
});

test('quiz 每题解释不少于 30 汉字', () => {
  for (const q of quiz.questions) {
    const n = (q.explain.match(/[\u4e00-\u9fff]/g) || []).length;
    assert.ok(n >= 30, '解释过短（' + n + '）：' + q.question);
  }
});

test('至少两道 check 题的正确选项落在正文原词上', () => {
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) => [...shingles(q.options[q.correct])].some((g) => body.has(g)));
  assert.ok(grounded.length >= 2, '接地的 check 题只有 ' + grounded.length + ' 道');
});

test('答案打散，不集中在一个下标', () => {
  const idx = new Set(quiz.questions.map((q) => q.correct));
  assert.ok(idx.size >= 3, '正确下标只有 ' + idx.size + ' 种');
});

test('规模与正文一致且非空', () => {
  const s = summarize();
  assert.strictEqual(s.hanzi, hanzi(doc));
  assert.ok(s.hanzi > 2000, '汉字过少：' + s.hanzi);
});

test('脚本可运行并打印现算结果', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('配子算术（本脚本现算）'), '输出缺少配子算术段');
  assert.ok(out.includes('四个孩子里恰好一个患病：42.2%'), '恰好一个未打印');
  assert.ok(out.includes('至少一个患病：68.4%'), '至少一个未打印');
  assert.ok(out.includes('五种传递方式（正文表格现算 5 种）'), '五种方式未打印');
  assert.ok(out.includes('判据词命中'), '输出缺少判据词段');
  assert.ok(!out.includes('✗'), '有判据词未命中');
  assert.match(out, /本输出仅用于教学演示，不构成临床判断依据/);
});

test('脚本抬头指向本章正文', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(src.includes('/chapters/' + SLUG + '/docs/zh.md'), '头部注释未指向本章');
});

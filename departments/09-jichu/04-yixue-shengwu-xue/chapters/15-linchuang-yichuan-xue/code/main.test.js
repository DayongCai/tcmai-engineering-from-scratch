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
  readDoc, sections, hanzi, actions, tiers, evidenceTable, evidenceGaps, ethics, management,
  missing, boundaries, summarize, CHAPTER, SLUG,
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

test('四个动作齐，次序为认表型→选检测→判结果→给交代', () => {
  const a = actions();
  assert.deepStrictEqual(a, ['认表型', '选检测', '判结果', '给交代']);
});

test('分级五档与正文一致', () => {
  const t = tiers();
  assert.deepStrictEqual(t, ['致病', '可能致病', '意义未明', '可能良性', '良性']);
});

test('证据表六类，计算预测被标为弱、单独不足以定级', () => {
  const e = evidenceTable();
  assert.strictEqual(e.length, 6, '证据类型不是 6 类：' + e.length);
  const calc = e.find((x) => /计算预测/.test(x.kind));
  assert.ok(calc, '没解析出计算预测一行');
  assert.match(calc.strength, /弱/);
  assert.match(calc.strength, /单独不足以定级/);
  const fn = e.find((x) => /功能实验/.test(x.kind));
  assert.match(fn.strength, /强/);
});

test('补证据四类缺口与伦理三原则都数得出来', () => {
  const g = evidenceGaps();
  assert.strictEqual(g.length, 4, '缺口不是 4 类：' + g.length);
  assert.ok(g.every((x) => /^缺/.test(x)), '缺口条目命名不符：' + g.join('、'));
  const e = ethics();
  assert.strictEqual(e.length, 3, '伦理原则不是 3 条：' + e.length);
  assert.ok(e.includes('非指令性'));
});

test('长期管理三项要求', () => {
  const m = management();
  assert.strictEqual(m.length, 3, '管理要求不是 3 条：' + m.length);
});

test('判据词全部能在正文找到', () => {
  assert.deepStrictEqual(missing(), [], '正文缺失判据词：' + missing().join('、'));
});

test('边界声明至少三条，且不给判读规则', () => {
  const b = boundaries();
  assert.ok(b.length >= 3, '边界条目过少：' + b.length);
  assert.ok(b.some((x) => /不给判读规则|不给任何/.test(x)), '边界未交代不给判读规则');
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
  assert.ok(out.includes('四个动作（正文现算 4 个）：认表型 → 选检测 → 判结果 → 给交代'), '四步未打印');
  assert.ok(out.includes('分级五档（5 档）'), '五档未打印');
  assert.ok(out.includes('证据类型（正文表格现算 6 类）'), '证据表未打印');
  assert.ok(out.includes('判据词命中'), '输出缺少判据词段');
  assert.ok(!out.includes('✗'), '有判据词未命中');
  assert.match(out, /本输出仅用于教学演示，不构成临床判断依据/);
});

test('脚本抬头指向本章正文', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(src.includes('/chapters/' + SLUG + '/docs/zh.md'), '头部注释未指向本章');
});

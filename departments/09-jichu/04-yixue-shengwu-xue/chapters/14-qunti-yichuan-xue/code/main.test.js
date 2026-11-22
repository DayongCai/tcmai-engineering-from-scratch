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
  readDoc, sections, hanzi, hwFromPrevalence, hwClaims, mutationSelectionBalance, forceTable,
  hwAssumptions, traps, missing, boundaries, summarize, CHAPTER, SLUG,
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

test('q² = 1/10000 → q = 0.01、2pq ≈ 0.0198、携带者∶患者 ≈ 198', () => {
  const h = hwFromPrevalence(1e-4);
  assert.ok(Math.abs(h.q - 0.01) < 1e-12);
  assert.ok(Math.abs(h.p - 0.99) < 1e-12);
  assert.ok(Math.abs(h.carriers - 0.0198) < 1e-4);
  assert.ok(Math.abs(h.ratio - 198) < 0.5);
  assert.ok(Math.abs(h.approxRatio - 200) < 1e-9);
  const c = hwClaims();
  assert.strictEqual(c.carriersStated, 0.0198);
  assert.strictEqual(c.ratioZh, '二百');
});

test('突变—选择平衡：μ=10⁻⁶、s=1 → q ≈ 0.001、携带者约千分之二', () => {
  const b = mutationSelectionBalance();
  assert.ok(b, '没读到平衡参数');
  assert.ok(Math.abs(b.mu - 1e-6) < 1e-18);
  assert.strictEqual(b.s, 1);
  assert.ok(Math.abs(b.q - 0.001) < 1e-6);
  assert.strictEqual(b.statedQ, 0.001);
  assert.ok(Math.abs(b.carriers - 0.002) < 1e-4);
  assert.strictEqual(b.statedCarrierZh, '千分之二');
});

test('平衡五前提、五种力量、三个陷阱都数得出来', () => {
  const a = hwAssumptions();
  assert.strictEqual(a.length, 5, '前提不是 5 条：' + a.length);
  const f = forceTable();
  assert.strictEqual(f.length, 5, '力量不是 5 种：' + f.length);
  assert.deepStrictEqual(f.map((x) => x.force), ['突变', '选择', '遗传漂变', '迁移', '非随机交配']);
  const t = traps();
  assert.strictEqual(t.length, 3, '陷阱不是 3 个：' + t.length);
});

test('非随机交配一行的多样性影响写的是「改变基因型分布」', () => {
  const row = forceTable().find((x) => /非随机交配/.test(x.force));
  assert.ok(row, '没解析出非随机交配一行');
  assert.match(row.diversity, /基因型分布/);
});

test('判据词全部能在正文找到', () => {
  assert.deepStrictEqual(missing(), [], '正文缺失判据词：' + missing().join('、'));
});

test('边界声明至少三条且标明全部数字为演算示例', () => {
  const b = boundaries();
  assert.ok(b.length >= 3, '边界条目过少：' + b.length);
  assert.ok(b.some((x) => /演算示例/.test(x)), '边界未交代演算示例');
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
  assert.ok(out.includes('患病率 → 携带者频率（正文口径现算）'), '输出缺少频率段');
  assert.ok(out.includes('2pq = 0.0198'), '携带者频率未打印');
  assert.ok(out.includes('突变—选择平衡（正文参数现算）'), '输出缺少平衡段');
  assert.ok(out.includes('平衡五前提（5 条）'), '五前提未打印');
  assert.ok(out.includes('判据词命中'), '输出缺少判据词段');
  assert.ok(!out.includes('✗'), '有判据词未命中');
  assert.match(out, /本输出仅用于教学演示，不构成临床判断依据/);
});

test('脚本抬头指向本章正文', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(src.includes('/chapters/' + SLUG + '/docs/zh.md'), '头部注释未指向本章');
});

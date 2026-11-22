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
  readDoc, sections, hanzi, cnToNumber, checkpointTable, accounts, timers, deathTable,
  fidelity, missing, boundaries, summarize, CHAPTER, SLUG,
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

test('中文数量解析对本章用到的口径成立', () => {
  assert.strictEqual(cnToNumber('三十亿'), 3e9);
  assert.strictEqual(cnToNumber('二百'), 200);
  assert.strictEqual(cnToNumber('两万'), 2e4);
});

test('三道闸解析出 3 行，位置与检查项都非空', () => {
  const g = checkpointTable();
  assert.strictEqual(g.length, 3, '闸口不是 3 道：' + g.length);
  for (const x of g) {
    assert.ok(x.where.length >= 2, '位置缺失：' + x.gate);
    assert.ok(x.checks.length >= 4, '检查项缺失：' + x.gate);
    assert.ok(x.otherwise.length >= 4, '不过会怎样缺失：' + x.gate);
  }
});

test('两笔账、三种计时器、三条死亡路径都数得出来', () => {
  assert.deepStrictEqual(accounts(), ['数量账', '保真账']);
  const t = timers();
  assert.strictEqual(t.length, 3, '计时器不是 3 种：' + t.length);
  const d = deathTable();
  assert.strictEqual(d.length, 3, '死亡路径不是 3 条：' + d.length);
  assert.deepStrictEqual(d.map((x) => x.mode), ['坏死', '凋亡', '自噬性死亡']);
});

test('保真账现算为每次复制约 30 个改变，与正文「几十个」一致', () => {
  const f = fidelity();
  assert.ok(f, '没读到碱基数或错误率');
  assert.strictEqual(f.bases, 3e9);
  assert.strictEqual(f.exponent, -8);
  assert.strictEqual(f.perReplication, 30);
  assert.strictEqual(f.matchesClaim, true);
});

test('死亡判据落在膜完整性上：坏死强烈、凋亡轻微', () => {
  const d = new Map(deathTable().map((x) => [x.mode, x]));
  assert.match(d.get('坏死').inflammation, /强烈/);
  assert.match(d.get('凋亡').inflammation, /轻微/);
  assert.match(d.get('坏死').membrane, /丧失/);
  assert.match(d.get('凋亡').membrane, /保持/);
});

test('判据词全部能在正文找到', () => {
  assert.deepStrictEqual(missing(), [], '正文缺失判据词：' + missing().join('、'));
});

test('边界声明至少三条且标明数字为常引口径', () => {
  const b = boundaries();
  assert.ok(b.length >= 3, '边界条目过少：' + b.length);
  assert.ok(b.some((x) => /常引口径/.test(x)), '边界未交代常引口径');
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
  assert.ok(out.includes('三道闸（正文表格现算 3 道）'), '闸口段缺失');
  assert.ok(out.includes('保真账现算'), '保真账段缺失');
  assert.ok(out.includes('每次复制约 30 个改变'), '改变数未打印');
  assert.ok(out.includes('判据词命中'), '输出缺少判据词段');
  assert.ok(!out.includes('✗'), '有判据词未命中');
  assert.match(out, /本输出仅用于教学演示，不构成临床判断依据/);
});

test('脚本抬头指向本章正文', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(src.includes('/chapters/' + SLUG + '/docs/zh.md'), '头部注释未指向本章');
});

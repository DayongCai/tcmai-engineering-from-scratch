'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { docText, analyze } = require('./main.js');

const QUIZ = path.join(__dirname, '..', 'quiz.json');
const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文六节，辨肿、辨痛、辨脓各占一节', () => {
  const a = analyze();
  assert.strictEqual(a.sections.length, 6, a.sections.join(' / '));
  for (const k of ['辨肿', '辨痛', '辨脓']) assert.ok(a.sections.some((t) => t.includes(k)), `缺 ${k}`);
});

test('阴阳对照七项，边界排在第一', () => {
  const a = analyze();
  assert.strictEqual(a.yinRows.length, 7);
  assert.strictEqual(a.yinRows[0], '边界');
});

test('辨肿五维、辨痛五问，数量与正文一致', () => {
  const a = analyze();
  assert.strictEqual(a.dims.length, 5);
  assert.strictEqual(a.dims[0], '边界');
  assert.strictEqual(a.dims[4], '搏动与杂音');
  assert.strictEqual(a.asks.length, 5);
  assert.deepStrictEqual(a.asks, ['性质', '时间', '诱因与缓解', '放射', '变化趋势']);
});

test('辨脓五据，最后一条是全身反应', () => {
  const a = analyze();
  assert.strictEqual(a.pusRows.length, 5);
  assert.strictEqual(a.pusRows[0], '病程与演变');
  assert.strictEqual(a.pusRows[4], '全身反应');
});

test('三条线齐全，且「可以等」在第一条', () => {
  const a = analyze();
  assert.strictEqual(a.lines.length, 3);
  assert.match(a.lines[0], /第一条线：可以等/);
  assert.match(a.lines[2], /第三条线：立即升级/);
});

test('quiz 结构：段齐、四选项、答案下标合法、解释够长', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  assert.ok(q.questions.length >= 5);
  const stages = new Set(q.questions.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s}`);
  for (const item of q.questions) {
    assert.strictEqual(item.options.length, 4);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4);
    assert.ok(hanzi(item.explain) >= 30, `解释过短：${item.question}`);
  }
});

test('quiz 的判断题能在正文里找到原词', () => {
  const body = shingles(docText());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const checks = q.questions.filter((x) => x.stage === 'check');
  assert.ok(checks.length >= 2);
  for (const item of checks) {
    const grams = [...shingles(item.options[item.correct])];
    assert.ok(grams.some((g) => body.has(g)), `未接地：${item.options[item.correct]}`);
  }
});

test('答案不挤在同一个下标', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  assert.ok(new Set(q.questions.map((x) => x.correct)).size >= 3);
});

test('脚本输出含五维、五问与三条线', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(String(r.stdout), /辨肿 5 维/);
  assert.match(String(r.stdout), /辨痛 5 问/);
  assert.match(String(r.stdout), /第三条线：立即升级/);
});

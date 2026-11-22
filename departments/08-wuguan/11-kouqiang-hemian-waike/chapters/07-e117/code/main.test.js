'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { docText, bucketOf, analyze } = require('./main.js');

const QUIZ = path.join(__dirname, '..', 'quiz.json');
const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文六节，窗口、出血、气道、单侧、外伤各占一节', () => {
  const a = analyze();
  assert.strictEqual(a.sections.length, 6, a.sections.join(' / '));
});

test('病证表八行，窗口分三档', () => {
  const a = analyze();
  assert.strictEqual(a.rows.length, 8);
  assert.strictEqual(a.groups['分钟档'].length, 2);
  assert.strictEqual(a.groups['天档'].length, 2);
  assert.strictEqual(a.groups['周月档'].length, 4);
});

test('最长的窗口配最贵的误判：鼻咽癌归入周月档', () => {
  const a = analyze();
  assert.ok(a.groups['周月档'].includes('鼻咽癌'));
  assert.strictEqual(bucketOf('月，但决定命运'), '周月档');
  assert.strictEqual(bucketOf('秒—小时（看位置）'), '分钟档');
});

test('单侧原则四条，把观察变成有条件的观察', () => {
  const a = analyze();
  assert.strictEqual(a.sideRules.length, 4);
  assert.ok(a.sideRules.filter((r) => r.includes('单侧')).length >= 3);
});

test('外伤排序三行，气道在最前', () => {
  const a = analyze();
  assert.strictEqual(a.trauma.length, 3);
  assert.strictEqual(a.trauma[0], '气道在前。');
  assert.strictEqual(a.trauma[2], '记录伤前功能在第三。');
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

test('脚本输出含三档计数与外伤排序', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(String(r.stdout), /分钟档（2）/);
  assert.match(String(r.stdout), /气道在前。 → 出血在次。 → 记录伤前功能在第三。/);
});

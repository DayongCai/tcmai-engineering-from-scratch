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

test('正文六节，通道、曲线、进食、防复各占一节', () => {
  const a = analyze();
  assert.strictEqual(a.sections.length, 6, a.sections.join(' / '));
});

test('三条通道就是气道、引流、进食，顺序固定', () => {
  const a = analyze();
  assert.deepStrictEqual(a.channels, ['气道', '引流', '进食']);
});

test('肿胀曲线六个观察项，含张口度与分泌物', () => {
  const a = analyze();
  assert.strictEqual(a.curve.length, 6);
  assert.ok(a.curve.includes('张口度'));
  assert.ok(a.curve.includes('分泌物'));
});

test('进食四档按张口度与吞咽能力分级', () => {
  const a = analyze();
  assert.strictEqual(a.eat.length, 4);
  assert.match(a.eat[0], /颌间固定/);
});

test('瘥后防复三类，接得上食复、劳复、情志复', () => {
  const a = analyze();
  assert.deepStrictEqual(a.recur, ['食复', '劳复', '情志复']);
});

test('返院指征三条，最后一条是立即返院', () => {
  const a = analyze();
  assert.strictEqual(a.backs.length, 3);
  assert.match(a.backs[2], /立即返院/);
  assert.match(a.backs[2], /咽不下东西/);
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

test('脚本输出含三条通道与三条返院指征', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(String(r.stdout), /三条通道（以小时计）：气道 → 引流 → 进食/);
  assert.match(String(r.stdout), /咽不下东西/);
});

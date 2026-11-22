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

test('正文六节，三法、外治、手术各占一节', () => {
  const a = analyze();
  assert.strictEqual(a.sections.length, 6, a.sections.join(' / '));
  assert.ok(a.sections.some((t) => t.includes('三法')));
  assert.ok(a.sections.some((t) => t.includes('手术改变的是空间事实')));
});

test('内治三法与病程三段对应', () => {
  const a = analyze();
  assert.deepStrictEqual(a.methods, ['消法', '托法', '补法']);
});

test('外治在颌面部要过三道窄门，第一道是皮肤', () => {
  const a = analyze();
  assert.strictEqual(a.gates.length, 3);
  assert.strictEqual(a.gates[0], '皮肤');
  assert.strictEqual(a.gates[1], '黏膜');
});

test('手术三个不能按气道在前的顺序排列', () => {
  const a = analyze();
  assert.deepStrictEqual(a.cannots, ['不能替代诊断', '不能替代病灶处理', '不能在气道未保时进行']);
});

test('三问的第一问落到时间、空间与界面', () => {
  const a = analyze();
  assert.strictEqual(a.asks.length, 3);
  assert.match(a.asks[0], /时间、空间，还是界面/);
});

test('正文明确只留方名，不给剂量与组成', () => {
  const a = analyze();
  assert.strictEqual(a.formulas.length, 3);
  assert.ok(a.noDose, '正文未声明不给剂量');
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

test('脚本输出含三道窄门与三个不能', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(String(r.stdout), /外治三道窄门：皮肤 \/ 黏膜/);
  assert.match(String(r.stdout), /不能在气道未保时进行/);
});

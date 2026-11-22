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

test('正文六节，命名与入口各占一节', () => {
  const a = analyze();
  assert.strictEqual(a.sections.length, 6, a.sections.join(' / '));
});

test('病名叠三层，缺一层名字就说不全', () => {
  const a = analyze();
  assert.deepStrictEqual(a.layers, ['病位深浅', '形态', '病性']);
});

test('入口被压到四条，不止牙源一条', () => {
  const a = analyze();
  assert.strictEqual(a.entries.length, 4);
  assert.ok(a.entries.some((x) => x.includes('牙与牙周')));
  assert.ok(a.entries.some((x) => x === '血行'));
});

test('四个征齐全，且按可靠性排序', () => {
  const a = analyze();
  assert.deepStrictEqual(a.signs, ['肿', '痛', '热', '功能障碍']);
});

test('宿主是可分层的变量，六行核对项', () => {
  const a = analyze();
  assert.strictEqual(a.hosts.length, 6);
  assert.ok(a.hosts.includes('血糖控制'));
  assert.ok(a.hosts.includes('头颈部放疗史'));
});

test('三步判断的顺序固定：入口 → 界面 → 全身', () => {
  const a = analyze();
  assert.deepStrictEqual(a.steps, ['定入口', '定界面', '定全身']);
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

test('脚本输出含入口条数与三步', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(String(r.stdout), /入口 4 条/);
  assert.match(String(r.stdout), /定入口 → 定界面 → 定全身/);
});

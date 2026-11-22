'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { docText, tables, analyze } = require('./main.js');

const QUIZ = path.join(__dirname, '..', 'quiz.json');
const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文六节，时段、清单、沟通、记录各占一节', () => {
  const a = analyze();
  assert.strictEqual(a.sections.length, 6, a.sections.join(' / '));
});

test('时段表六段，从术中排到数年', () => {
  const a = analyze();
  assert.strictEqual(a.periods.length, 6);
  assert.strictEqual(a.periods[0], '术中');
  assert.ok(a.periods.includes('全程'));
  assert.deepStrictEqual(a.fastest, ['术后数小时内']);
});

test('并发症表七条，每条四列（信号、恶化方向、决定人齐全）', () => {
  const a = analyze();
  assert.strictEqual(a.comps.length, 7);
  const t = tables(docText()).find((x) => x[0][0] === '并发症');
  for (const row of t) assert.strictEqual(row.length, 4, row.join('|'));
  assert.strictEqual(a.comps[0].name, '创口出血／血肿');
});

test('信号是行为级的，不是等数值', () => {
  const a = analyze();
  const airway = a.comps.find((c) => c.name === '肿胀压迫气道');
  assert.match(airway.signal, /愿坐不愿卧|说话变闷/);
});

test('坏消息四段与三个不许', () => {
  const a = analyze();
  assert.deepStrictEqual(a.stages, ['事实', '影响', '下一步', '责任与再谈时间']);
  assert.strictEqual(a.forbids.length, 3);
  assert.match(a.forbids[0], /在走廊说/);
});

test('记录四要素，时间是发现的时间', () => {
  const a = analyze();
  assert.deepStrictEqual(a.record, ['时间', '表现', '判断', '动作与回应']);
  assert.match(docText(), /发现的时间，不是记录的时间/);
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

test('脚本输出含时段、信号与四段', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(String(r.stdout), /按时段排队 6 段/);
  assert.match(String(r.stdout), /事实 → 影响 → 下一步 → 责任与再谈时间/);
});

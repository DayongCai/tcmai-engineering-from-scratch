'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, analyze, tables, docText } = require('./main.js');

const QUIZ = path.join(__dirname, '..', 'quiz.json');
const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文可读，规模与章题相称', () => {
  const a = analyze();
  assert.ok(a.hanzi > 3000, `汉字过少：${a.hanzi}`);
  assert.strictEqual(a.sections.length, 6, `小节数变了：${a.sections.join(' / ')}`);
});

test('能力包表是五项，气道在列', () => {
  const a = analyze();
  assert.deepStrictEqual(a.items, ['人', '设备', '血', '病理', '气道']);
  assert.ok(tables(docText()).length >= 1);
});

test('三问按顺序，且首尾落在诊断与并发症上', () => {
  const a = analyze();
  assert.strictEqual(a.asks.length, 3);
  assert.deepStrictEqual(a.asks.map((x) => x.n), [1, 2, 3]);
  assert.match(a.asks[0].stem, /诊断/);
  assert.match(a.asks[2].stem, /并发症/);
});

test('气道被反复交代，不是一句背景', () => {
  const a = analyze();
  assert.ok(a.airway >= 5, `气道出现 ${a.airway} 次，少于 5`);
  assert.ok(a.referral >= 2, `转诊出现 ${a.referral} 次`);
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
  const spread = new Set(q.questions.map((x) => x.correct));
  assert.ok(spread.size >= 3, `正确项只用了 ${spread.size} 个下标`);
});

test('脚本可运行并指向本章正文', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(String(r.stdout), /能力包（表中 5 项）/);
  assert.ok(fs.readFileSync(DOC, 'utf8').includes('谁能承担后果'));
});

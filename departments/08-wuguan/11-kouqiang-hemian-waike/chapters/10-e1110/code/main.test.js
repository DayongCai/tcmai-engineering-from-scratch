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

test('正文六节，病历、同意、转诊、隐私各占一节', () => {
  const a = analyze();
  assert.strictEqual(a.sections.length, 6, a.sections.join(' / '));
});

test('三个读者：自己、接手的人、将来追问的人', () => {
  const a = analyze();
  assert.strictEqual(a.readers.length, 3);
  assert.match(a.readers[0], /三个月后的自己/);
  assert.match(a.readers[1], /接手的人/);
  assert.match(a.readers[2], /追问/);
});

test('六个必写项把气道与感觉都收进去', () => {
  const a = analyze();
  assert.deepStrictEqual(a.musts, ['肿', '张口度', '牙位与咬合', '感觉', '气道', '既往与用药']);
});

test('必写项每条三列：怎么写、为什么这样写', () => {
  const t = tables(docText()).find((x) => x[0][0] === '必写项');
  for (const row of t) assert.strictEqual(row.length, 3, row.join('|'));
});

test('同意要能复述三件事', () => {
  const a = analyze();
  assert.strictEqual(a.consent.length, 3);
  assert.match(a.consent[0], /不能确定/);
  assert.match(a.consent[1], /选择/);
});

test('转诊包六件，联系人也在其中', () => {
  const a = analyze();
  assert.strictEqual(a.packet.length, 6);
  assert.ok(a.packet.includes('联系人'));
  assert.ok(a.packet.includes('影像'));
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

test('脚本输出含必写项与转诊包', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(String(r.stdout), /必写 6 项/);
  assert.match(String(r.stdout), /转诊包 6 件/);
});

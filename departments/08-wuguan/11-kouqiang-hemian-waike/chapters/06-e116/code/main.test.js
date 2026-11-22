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

test('正文六节，病名表与落点表各占一节', () => {
  const a = analyze();
  assert.strictEqual(a.sections.length, 6, a.sections.join(' / '));
});

test('十个病名齐全，顺序按教材', () => {
  const a = analyze();
  assert.deepStrictEqual(a.diseases.map((d) => d.name), [
    '疖', '疔', '痈', '有头疽', '丹毒', '走黄／内陷', '瘰疬', '流注', '附骨疽', '流痰'
  ]);
});

test('深度轴不是形容词：疖出脓即愈，流痰脓稀成窦道', () => {
  const a = analyze();
  const jie = a.diseases.find((d) => d.name === '疖');
  const tan = a.diseases.find((d) => d.name === '流痰');
  assert.match(jie.pus, /出脓即愈/);
  assert.match(tan.pus, /脓稀/);
  assert.match(tan.spread, /窦道/);
});

test('丹毒被单独识别为不按化脓走的一个', () => {
  const a = analyze();
  assert.deepStrictEqual(a.nonPus, ['丹毒']);
});

test('离局部的病名被识别出来', () => {
  const a = analyze();
  assert.ok(a.spreads.includes('走黄／内陷'));
  assert.ok(a.spreads.includes('流注'));
});

test('深度读数四项，第一项是脓头数目', () => {
  const a = analyze();
  assert.strictEqual(a.readings.length, 4);
  assert.strictEqual(a.readings[0], '脓头的数目');
  assert.strictEqual(a.readings[2], '推之移不移');
});

test('颌面落点表十行，每行三列', () => {
  const a = analyze();
  assert.strictEqual(a.mapping.length, 10);
  const mapT = tables(docText()).find((t) => t[0][0] === '教材病名');
  for (const row of mapT) assert.strictEqual(row.length, 3, row.join('|'));
  assert.ok(a.mapping.some((m) => m.src === '附骨疽' && /颌骨骨髓炎/.test(m.face)));
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

test('脚本输出含十个病名与颌面落点', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(String(r.stdout), /病名 10 个/);
  assert.match(String(r.stdout), /不按化脓走的病名：丹毒/);
});

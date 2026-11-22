'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, analyze, docText } = require('./main.js');

const QUIZ = path.join(__dirname, '..', 'quiz.json');
const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text).replace(/[^一-鿿]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文可读，规模与章题相称', () => {
  const a = analyze();
  assert.ok(a.hanzi > 2800, `汉字过少：${a.hanzi}`);
  assert.strictEqual(a.sections.length, 7, `节数变了：${a.sections.join(' / ')}`);
});

test('病程三段按时间排，前驱在最前', () => {
  const a = analyze();
  assert.deepStrictEqual(a.timeline, ['前驱段', '疱疹段', '疹后段']);
});

test('证型表三行，气滞血瘀收在末行', () => {
  const a = analyze();
  assert.deepStrictEqual(a.rows, ['肝经郁热', '脾虚湿蕴', '气滞血瘀']);
});

test('外治按「破没破」排，三态顺序不可颠倒', () => {
  const a = analyze();
  assert.strictEqual(a.outside.length, 3);
  assert.ok(a.orderOk, `顺序变了：${a.outside.join(' / ')}`);
});

test('红线四条，疼痛与转介在正文里有分量', () => {
  const a = analyze();
  assert.strictEqual(a.redlines.length, 4);
  assert.ok(a.latePain >= 5, `后遗神经痛只出现 ${a.latePain} 次`);
  assert.ok(a.referral >= 1, `转介只出现 ${a.referral} 次`);
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
  let grounded = 0;
  for (const item of checks) {
    const grams = [...shingles(item.options[item.correct])];
    if (grams.some((g) => body.has(g))) grounded += 1;
  }
  assert.ok(grounded >= 2, `只有 ${grounded} 道题接地`);
});

test('答案不挤在同一个下标', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const spread = new Set(q.questions.map((x) => x.correct));
  assert.ok(spread.size >= 3, `正确项只用了 ${spread.size} 个下标`);
});

test('脚本可运行并指向本章正文', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(String(r.stdout), /外治三态/);
  assert.ok(fs.readFileSync(DOC, 'utf8').includes('刺痛，固定不移'));
});

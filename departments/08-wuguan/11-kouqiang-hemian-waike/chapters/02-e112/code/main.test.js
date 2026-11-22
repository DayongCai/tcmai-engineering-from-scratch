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

test('正文有六节，层次与间隙各占一节', () => {
  const a = analyze();
  assert.strictEqual(a.sections.length, 6, a.sections.join(' / '));
  assert.ok(a.sections.some((t) => t.includes('五层')));
  assert.ok(a.sections.some((t) => t.includes('间隙')));
});

test('层次表是五层，颅顶单列在末', () => {
  const a = analyze();
  assert.strictEqual(a.layers.length, 5);
  assert.strictEqual(a.layers[0], '皮肤');
  assert.strictEqual(a.layers[4], '颅顶腱膜下');
});

test('间隙表六行，且每行四列', () => {
  const a = analyze();
  assert.strictEqual(a.gaps.length, 6);
  const gapT = tables(docText()).find((t) => t[0][0] === '间隙');
  for (const row of gapT) assert.strictEqual(row.length, 4, row.join('|'));
  assert.ok(a.gaps.some((g) => g.name === '舌下间隙'));
  assert.ok(a.gaps.some((g) => g.name === '咽旁间隙'));
});

test('把气道风险落到具体间隙，而不是笼统说危险', () => {
  const a = analyze();
  assert.ok(a.deepRisk.includes('咽旁间隙'));
  assert.ok(a.deepRisk.includes('舌下间隙'));
});

test('两套神经线分开：面神经五支、三叉神经三出口', () => {
  const a = analyze();
  assert.strictEqual(a.branches.length, 5);
  assert.ok(a.branches.includes('下颌缘支'));
  assert.deepStrictEqual(a.exits, ['眶上裂', '圆孔', '卵圆孔']);
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

test('脚本输出含间隙数与相通去向', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(String(r.stdout), /间隙 6 个/);
  assert.match(String(r.stdout), /颈深部、纵隔/);
});

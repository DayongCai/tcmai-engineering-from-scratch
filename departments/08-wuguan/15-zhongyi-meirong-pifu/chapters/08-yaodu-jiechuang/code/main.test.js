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
  assert.ok(a.hanzi > 3200, `汉字过少：${a.hanzi}`);
  assert.strictEqual(a.sections.length, 7, `节数变了：${a.sections.join(' / ')}`);
});

test('药毒四证按深浅分层，气阴两虚在后期', () => {
  const a = analyze();
  assert.deepStrictEqual(a.rows, ['风热', '湿热', '血热', '气阴两虚']);
});

test('重症四信号各就各位，黏膜在最前', () => {
  const a = analyze();
  assert.strictEqual(a.signals.length, 4);
  assert.strictEqual(a.signals[0], '黏膜受累');
  assert.ok(a.signals.includes('尼氏征阳性'));
});

test('疥疮三物证与处置三头都是三件，缺一不断链', () => {
  const a = analyze();
  assert.strictEqual(a.evidence.length, 3);
  assert.strictEqual(a.actions.length, 3);
  assert.ok(a.actions.includes('密切接触者'));
});

test('两病的第一步都是减法，消毒与停药在正文里有分量', () => {
  const a = analyze();
  assert.ok(a.stopFirst, '正文应写明先停药、再辨证');
  assert.ok(a.killFirst, '正文应写明先杀虫消毒、再谈内外');
  assert.ok(a.stop >= 4, `停药只出现 ${a.stop} 次`);
  assert.ok(a.disinfect >= 8, `消毒只出现 ${a.disinfect} 次`);
  assert.ok(a.temp >= 1, '50℃ 应作为物理参数出现在正文');
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
  assert.match(String(r.stdout), /重症四信号/);
  assert.ok(fs.readFileSync(DOC, 'utf8').includes('尼氏征阳性'));
});

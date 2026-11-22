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

test('证型表三行，肝肾不足不是唯一答案', () => {
  const a = analyze();
  assert.deepStrictEqual(a.rows, ['血热风燥', '气滞血瘀', '肝肾不足']);
});

test('望诊四看，毛囊口在列', () => {
  const a = analyze();
  assert.strictEqual(a.looks.length, 4);
  assert.ok(a.looks.some((x) => x.includes('毛囊口')), `望诊项：${a.looks.join('、')}`);
});

test('会伪装成斑秃的五种病都在正文里点名', () => {
  const a = analyze();
  assert.strictEqual(a.fakes.length, 5);
  assert.ok(a.fakes.some((x) => x.includes('瘢痕性脱发')));
  assert.ok(a.fakes.some((x) => x.includes('头癣')));
});

test('毛囊与瘢痕是本章的判据词，不是顺带一提', () => {
  const a = analyze();
  assert.ok(a.gate, '正文应把「毛囊口存在、无瘢痕」写成前置判断');
  assert.ok(a.scar, '正文应写明毛囊已毁则生发治疗无效');
  assert.ok(a.follicle >= 8, `毛囊只出现 ${a.follicle} 次`);
  assert.ok(a.avoid >= 6, `瘢痕只出现 ${a.avoid} 次`);
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
  assert.match(String(r.stdout), /会伪装成斑秃的病 5 个/);
  assert.ok(fs.readFileSync(DOC, 'utf8').includes('感叹号发'));
});

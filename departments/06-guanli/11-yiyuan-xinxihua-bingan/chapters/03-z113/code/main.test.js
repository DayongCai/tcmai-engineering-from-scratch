'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, parseTables, params, structure, compute, verify } = require('./main.js');

const BODY = read();
const P = params(BODY, parseTables(BODY));
const S = structure(BODY);
const C = compute(P);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^一-鿿]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下，标题与章号一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '03-z113', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 3);
  assert.strictEqual(BODY.split('\n')[0], '# 第 3 章 · ' + TITLE);
});

test('时限表 14 条，入院 24 小时、首次病程 8 小时，读自正文', () => {
  assert.strictEqual(P.tl.rows, 14);
  assert.strictEqual(P.tl.admission, 24);
  assert.strictEqual(P.tl.firstCourse, 8);
  assert.strictEqual(P.tl.surgery, 24);
  assert.ok(P.tl.names.includes('死亡病例讨论记录'));
});

test('同意书按「五栏加一栏」数是 6 栏', () => {
  assert.strictEqual(P.consentItems, 6);
  assert.ok(BODY.includes('五栏加一栏'));
});

test('时间戳矛盾可算：首次病程早于入院记录 30 分钟', () => {
  assert.strictEqual(P.admitClock, '09:20');
  assert.strictEqual(P.firstClock, '08:50');
  assert.strictEqual(C.diff, 30);
  assert.strictEqual(C.contradiction, true);
  assert.strictEqual(C.firstWithinLimit, true);
});

test('签名三层、病程四问，清点与正文一致', () => {
  assert.strictEqual(S.signLayers, 3);
  assert.strictEqual(S.courseQs, 4);
});

test('病例参数读自正文：38 页、62 必填项、9 模板句、18 床', () => {
  assert.strictEqual(P.pages, 38);
  assert.strictEqual(P.requiredFields, 62);
  assert.strictEqual(P.templateLines, 9);
  assert.strictEqual(P.beds, 18);
  assert.strictEqual(P.rescueHours, 6);
});

test('正文与复算对得上（verify 不抛错）', () => {
  assert.doesNotThrow(() => verify(C, S, P, BODY));
});

test('quiz 的 check 题正确选项落在本章正文里（≥2 道）', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const body = shingles(BODY);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) => {
    const right = String(q.options[q.correct] || '');
    return [...shingles(right)].some((g) => body.has(g));
  });
  assert.ok(checks.length >= 2);
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
});

test('脚本可运行，输出含时间戳矛盾判定与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /前者早 30 分钟，不自洽（矛盾）/);
  assert.match(r.stdout, /不构成病历书写规范解释或法律意见/);
});

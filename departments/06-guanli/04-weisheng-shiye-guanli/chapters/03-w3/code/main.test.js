'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, analyze,
  fourThings, tierDrift, referralWill, sinkingForms, handoverIndicators,
} = require('./main.js');

const BODY = read();
const A = analyze(BODY);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '03-w3', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 3);
  assert.strictEqual(TITLE, '分级诊疗不是把病人往下推，是让下面接得住');
  assert.match(BODY.split('\n')[0], /^# 第 3 章 · /);
  assert.ok(BODY.split('\n')[0].includes(TITLE));
});

test('正文统计可复算：汉字、节、表、引文', () => {
  assert.ok(A.hanzi > 2500 && A.hanzi < 5000, String(A.hanzi));
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.tableCount, 4);
  assert.strictEqual(A.cites.length, 1);
  const sum = A.sections.reduce((s, x) => s + x.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, `${sum} vs ${A.hanzi}`);
});

test('四件事凑齐四件，且与正文列举一致', () => {
  assert.deepStrictEqual(fourThings(BODY), ['基层看得好', '病人愿意去', '上转接得上', '下转有人管']);
});

test('层级功能表：4 行全部错位，基层被标注为能力萎缩', () => {
  const t = tierDrift(A.tables);
  assert.strictEqual(t.rows, 4);
  assert.strictEqual(t.drifted, 4);
  assert.deepStrictEqual(t.shrink, ['基层机构']);
});

test('下转意愿：两种床位状态，只有一种愿意下转', () => {
  const w = referralWill(A.tables);
  assert.strictEqual(w.rows, 2);
  assert.strictEqual(w.willing, 1);
});

test('下沉四形式：输血 3、造血 1', () => {
  const s = sinkingForms(A.tables);
  assert.strictEqual(s.rows, 4);
  assert.strictEqual(s.transfuse, 3);
  assert.strictEqual(s.graft, 1);
  assert.match(BODY, /前三种是「输血」，第四种是「造血」/);
});

test('承接确认看两项指标', () => {
  assert.deepStrictEqual(handoverIndicators(BODY), ['四周内再入院率', '随访完成率']);
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

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /不构成诊疗意见/);
  assert.match(r.stdout, /输血 3 种、造血 1 种/);
});

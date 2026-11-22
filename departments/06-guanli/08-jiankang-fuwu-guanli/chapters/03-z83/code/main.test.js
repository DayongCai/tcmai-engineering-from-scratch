'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, hanzi, sections, audit } = require('./main.js');

const BODY = read();
const A = audit(BODY);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '03-z83', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 3);
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 3 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).length, 5);
  assert.ok([...BODY.matchAll(/《([^》\n]+)》/g)].length >= 1);
});

test('六个环节与三个断点从正文读出', () => {
  assert.deepStrictEqual(A.steps, ['建档', '筛查', '预约就诊', '服务与干预', '随访', '转诊与反馈']);
  assert.strictEqual(A.counts.steps, 6);
  assert.strictEqual(A.breakpoints, 3);
  assert.match(BODY, /第一处断点在建档之后/);
  assert.match(BODY, /第二处断点在随访/);
  assert.match(BODY, /第三处断点在转诊/);
});

test('三重用途与四个随访数，条数与中文数字对账', () => {
  assert.deepStrictEqual(A.uses, ['临床', '公共卫生', '管理']);
  assert.strictEqual(A.counts.uses, 3);
  assert.deepStrictEqual(A.followNums, ['应随访人数', '实际随访人数', '有效随访人数', '异常处置闭环人数']);
  assert.deepStrictEqual(A.mismatched, []);
});

test('卷首数字复算：人均负荷与随访缺口', () => {
  const { raw, derived } = A;
  assert.strictEqual(raw.population, 62000);
  assert.strictEqual(raw.gps, 8);
  assert.strictEqual(raw.visits, 110000);
  assert.strictEqual(raw.hypertension, 4800);
  assert.strictEqual(raw.followRate, 61);
  assert.strictEqual(raw.files, 59000);
  assert.strictEqual(raw.filedWithFollow, 38);
  assert.strictEqual(derived.visitsPerGp, 13750);
  assert.strictEqual(derived.htnPerGp, 600);
  assert.strictEqual(derived.halfDayMinutes, 160);
  assert.strictEqual(derived.followedFiles, 22420);
  assert.strictEqual(derived.followedHtn, 2928);
  assert.ok(derived.halfDayMinutes <= 240, '半天号源超出半日工时');
});

test('quiz 的 check 题正确选项落在本章正文里（≥2 道），答案下标打散', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const body = shingles(BODY);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) => {
    const right = String(q.options[q.correct] || '');
    return [...shingles(right)].some((g) => body.has(g));
  });
  assert.ok(checks.length >= 2);
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
  const used = new Set(quiz.questions.map((q) => q.correct));
  assert.ok(used.size >= 3, '正确答案过于集中在一个下标');
  for (const q of quiz.questions) {
    assert.strictEqual(q.options.length, 4);
    assert.ok(hanzi(q.explain) >= 30, q.question);
  }
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /对账一致/);
  assert.match(r.stdout, /不构成诊疗意见/);
});

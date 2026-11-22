'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, hanzi, sections, clockTimes, audit } = require('./main.js');

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
  assert.ok(DOC.endsWith(path.join('chapters', '08-z88', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 8);
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 8 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).length, 5);
  assert.ok([...BODY.matchAll(/《([^》\n]+)》/g)].length >= 1);
});

test('应急四段、准备三件事、演练三条件都数得出来', () => {
  assert.deepStrictEqual(A.phases, ['预防', '准备', '响应', '恢复']);
  assert.strictEqual(A.counts.readiness, 3);
  assert.match(A.readiness[0], /通信能不能通/);
  assert.match(A.readiness[1], /队伍能不能动（半小时内能召集多少人、带什么装备）/);
  assert.deepStrictEqual(A.drillRules, ['不预告时间', '不预设脚本', '允许失败']);
});

test('三种机制、两种失败、成功协同三样东西、平战三笔账对账', () => {
  assert.strictEqual(A.counts.mechanisms, 3);
  assert.strictEqual(A.counts.failures, 2);
  assert.deepStrictEqual(A.successPieces, ['一张跨部门的流程单', '一个有权调度的人', '一套能看见进度的数据']);
  assert.strictEqual(A.counts.accounts, 3);
  assert.deepStrictEqual(A.mismatched, []);
});

test('卷首时间线复算：通报 40 分钟、采样 110 分钟，超时 10 与 80 分钟', () => {
  const times = clockTimes(BODY);
  assert.strictEqual(times[0], 9 * 60 + 40);
  assert.strictEqual(times[1], 10 * 60 + 20);
  assert.strictEqual(times[2], 11 * 60 + 30);
  assert.strictEqual(A.derived.notifyGap, 40);
  assert.strictEqual(A.derived.sampleGap, 110);
  assert.strictEqual(A.raw.assumed, 30);
  assert.strictEqual(A.derived.notifyLate, 10);
  assert.strictEqual(A.derived.sampleLate, 80);
  assert.strictEqual(A.raw.students, 27);
  assert.strictEqual(A.raw.systems, 3);
  assert.strictEqual(A.raw.drillYears, 3);
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
  assert.match(r.stdout, /超时 10 分钟/);
  assert.match(r.stdout, /不构成应急指挥或政策意见/);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, hanzi, sections,
  objects, authColumns, systemTests, realSystems, reportRules, incidentScope, payModels, retention, auditMath, audit,
} = require('./main.js');

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
  assert.ok(DOC.endsWith(path.join('chapters', '13-j13', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 13);
  assert.strictEqual(BODY.split('\n')[0], `# 第 13 章 · ${TITLE}`);
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).filter((s) => s.title).length, 6);
  assert.ok(new Set([...BODY.matchAll(/《([^》]+)》/g)].map((m) => m[1])).size >= 1);
});

test('三个对象与授权表四列', () => {
  assert.deepStrictEqual(A.objs, ['人', '制度', '证据']);
  assert.deepStrictEqual(A.cols, ['岗位', '可独立完成的事项', '须在他人指导下完成的事项', '不得从事的事项']);
  assert.match(A.cols[3], /不得从事/);
});

test('制度三检验与六条真正成立的制度', () => {
  assert.deepStrictEqual(A.tests, ['有触发条件', '有明确动作', '有例外出口']);
  assert.strictEqual(A.real.length, 6);
  assert.match(A.real[0], /转介的触发与流程/);
  assert.match(A.real[5], /信息的使用与共享/);
});

test('上报三做法与不良事件六类', () => {
  assert.strictEqual(A.reports.length, 3);
  assert.match(A.reports[0], /区分「报告」与「追责」/);
  assert.strictEqual(A.incidents.length, 6);
  assert.match(A.incidents.join('/'), /该转介而未及时转介/);
  assert.match(A.incidents.join('/'), /信息泄露/);
});

test('收费三模式与留人三处', () => {
  assert.deepStrictEqual(A.models, ['按次收费', '按年收费', '项目购买']);
  assert.deepStrictEqual(A.keep, ['明确的授权边界', '可完成的工作量', '能看到进步的评价']);
});

test('抽考复算：22 人里 9 人能答，40.9%', () => {
  assert.strictEqual(A.math.staff, 22);
  assert.strictEqual(A.math.pass, 9);
  assert.strictEqual(A.math.passPct, 40.9);
  assert.strictEqual(A.math.recordPct, 31.8);
  assert.ok(A.math.pages === 60 && A.math.turnover === 60 && A.math.days === 11);
});

test('清单条数与句中的中文数字对账一致', () => {
  assert.deepStrictEqual(A.mismatched, []);
  assert.strictEqual(A.claims.length, 8);
});

test('quiz：check 题正确选项落在正文里（≥2 道），答案下标打散', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const body = shingles(BODY);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) =>
    [...shingles(q.options[q.correct])].some((g) => body.has(g)));
  assert.ok(checks.length >= 2);
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
  const used = new Set(quiz.questions.map((q) => q.correct));
  assert.ok(used.size >= 3, '正确答案过于集中在一个下标');
  for (const q of quiz.questions) {
    assert.strictEqual(q.options.length, 4, q.question);
    assert.ok(hanzi(q.explain) >= 30, q.question);
  }
});

test('脚本可运行，输出含复算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /22 人中 9 人答得出转介条件（40\.9%）/);
  assert.match(r.stdout, /对账：一致/);
  assert.match(r.stdout, /不构成管理咨询意见/);
});

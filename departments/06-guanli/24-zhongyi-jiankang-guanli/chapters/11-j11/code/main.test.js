'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, hanzi, sections, cn2num,
  nodes, screening, evalLayers, confirmSteps, recordSet, degradations, formMath, audit,
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
  assert.ok(DOC.endsWith(path.join('chapters', '11-j11', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 11);
  assert.strictEqual(BODY.split('\n')[0], `# 第 11 章 · ${TITLE}`);
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).filter((s) => s.title).length, 6);
  assert.ok(new Set([...BODY.matchAll(/《([^》]+)》/g)].map((m) => m[1])).size >= 1);
});

test('六节点顺序与交付物', () => {
  assert.deepStrictEqual(A.nd.map((n) => n.node), ['受理与初筛', '评估与辨识', '方案与确认', '执行', '随访', '评价与结案']);
  assert.match(A.nd[4].test, /有删项、有增项、有原因/);
  assert.match(A.nd[5].test, /哪一环起了作用/);
});

test('初筛三问、评估三层、确认三事', () => {
  assert.strictEqual(A.scr.length, 3);
  assert.match(A.scr[1], /有没有确诊/);
  assert.deepStrictEqual(A.evals, ['状态描述', '分层结论', '可复评的锚点']);
  assert.deepStrictEqual(A.conf, ['说明依据', '说明边界', '说明配合项']);
});

test('记录五项里，「没做成什么」被点名为最致命', () => {
  assert.deepStrictEqual(A.rec, ['做了什么', '没做成什么', '对象的反馈', '异常与处置', '下一轮的调整方向']);
  assert.match(BODY, /缺少第二项的记录最致命/);
});

test('退化四形态与识别信号', () => {
  assert.deepStrictEqual(A.degr, ['表单化', '空心化', '越界化', '断点化']);
  assert.match(BODY, /表单化最容易被误认为规范/);
  assert.match(BODY, /连续两轮的方案逐字相同，只有日期在变/);
});

test('中文数字与表单复算：11 张对 6 节点，多出 5 张', () => {
  assert.strictEqual(cn2num('十一'), 11);
  assert.strictEqual(cn2num('二十'), 20);
  assert.deepStrictEqual(A.math, { forms: 11, complete: 96, lost: 43 });
  assert.strictEqual(A.math.forms - A.nd.length, 5);
});

test('清单条数与句中的中文数字对账一致', () => {
  assert.deepStrictEqual(A.mismatched, []);
  assert.strictEqual(A.claims.length, 7);
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
  assert.match(r.stdout, /11 张表单对 6 个节点，多出 5 张/);
  assert.match(r.stdout, /对账：一致/);
  assert.match(r.stdout, /不构成诊疗意见/);
});

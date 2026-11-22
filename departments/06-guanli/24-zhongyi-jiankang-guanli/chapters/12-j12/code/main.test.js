'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, hanzi, sections,
  shizhuanOrder, constraints, reviewLayers, forms, levers, evalLayers, compareMath, audit,
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
  assert.ok(DOC.endsWith(path.join('chapters', '12-j12', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 12);
  assert.strictEqual(BODY.split('\n')[0], `# 第 12 章 · ${TITLE}`);
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).filter((s) => s.title).length, 6);
  assert.ok(new Set([...BODY.matchAll(/《([^》]+)》/g)].map((m) => m[1])).size >= 2);
});

test('《师传》四步次序与多数科普相反', () => {
  assert.deepStrictEqual(A.order, ['败', '善', '导其所便', '开其所苦']);
  assert.match(BODY, /多数科普从「善」开始/);
  assert.match(BODY, /四步里最难的是第三步/);
});

test('三条硬约束与审核四层', () => {
  assert.deepStrictEqual(A.cons, ['不承诺', '不越界', '可核查']);
  assert.deepStrictEqual(A.review, ['事实层', '边界层', '适配层', '留痕层']);
  assert.match(BODY, /审核人应当与讲者分离/);
});

test('五种形式各有能改变与改变不了的两栏', () => {
  assert.deepStrictEqual(A.fs5.map((f) => f.form.slice(0, 4)), ['大型讲座', '小组活动', '一对一指', '场所改造', '图文与短']);
  assert.match(A.fs5[4].cannot, /深度理解与纠错/);
  assert.match(A.fs5[0].cannot, /具体行为/);
});

test('依从四杠杆与评价四层', () => {
  assert.deepStrictEqual(A.lv, ['能力', '机会', '动机', '反馈']);
  assert.deepStrictEqual(A.evals, ['知晓层', '信念层', '行为层', '状态层']);
  assert.match(BODY, /能力与机会属于服务端的责任/);
});

test('对照复算：2880 人次、18% 记得、6% 改了、67.5% 得到配合', () => {
  assert.strictEqual(A.cmp.attendance, 2880);
  assert.strictEqual(A.cmp.canTellPct, 18);
  assert.strictEqual(A.cmp.changedPct, 6);
  assert.strictEqual(A.cmp.familyPct, 67.5);
  assert.ok(A.cmp.familyPct > A.cmp.changedPct * 10);
});

test('清单条数与句中的中文数字对账一致', () => {
  assert.deepStrictEqual(A.mismatched, []);
  assert.strictEqual(A.claims.length, 6);
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
  assert.match(r.stdout, /= 2880 人次/);
  assert.match(r.stdout, /对账：一致/);
  assert.match(r.stdout, /不构成诊疗意见/);
});

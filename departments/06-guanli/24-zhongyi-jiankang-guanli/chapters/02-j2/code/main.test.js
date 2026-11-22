'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, hanzi, sections, sectionText,
  engineeringConditions, riskLayers, misuses, riskMultipliers, shenRows, audit,
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
  assert.ok(DOC.endsWith(path.join('chapters', '02-j2', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 2);
  assert.strictEqual(BODY.split('\n')[0], `# 第 2 章 · ${TITLE}`);
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).filter((s) => s.title).length, 6);
  assert.ok(new Set([...BODY.matchAll(/《([^》]+)》/g)].map((m) => m[1])).size >= 2);
});

test('三个工程条件就是可测、可分、可重复，不多不少', () => {
  assert.deepStrictEqual(A.conds, ['可测', '可分', '可重复']);
  assert.match(sectionText(BODY, '三、'), /可测/);
});

test('风险接口三层，顺序是分层→排序→动作', () => {
  assert.deepStrictEqual(A.layers.map((l) => l.n), ['一', '二', '三']);
  assert.deepStrictEqual(A.layers.map((l) => l.action), ['状态用于分层', '风险因素用于排序', '两者共同决定动作']);
});

test('三种典型误用与两个乘数都从正文读出', () => {
  assert.deepStrictEqual(A.misuse, ['把体质当诊断', '把体质当终身标签', '用体质替代风险评估']);
  assert.deepStrictEqual(A.mult, ['发生的可能性', '后果的严重程度']);
  assert.strictEqual(A.mult.length, 2);
});

test('「神」拆成五项可观察项，没有落在形容词上', () => {
  assert.deepStrictEqual(A.shen, ['睡眠', '情绪', '精力', '注意力', '社交意愿']);
});

test('清单条数与句中的中文数字对账一致', () => {
  assert.deepStrictEqual(A.mismatched, []);
  assert.strictEqual(A.claims.length, 5);
});

test('missing section 会报错，不静默返回空串', () => {
  assert.throws(() => sectionText(BODY, '九、'), /没有以「九、」开头的一节/);
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

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /对账：一致/);
  assert.match(r.stdout, /可测／可分／可重复/);
  assert.match(r.stdout, /不构成诊疗意见/);
});

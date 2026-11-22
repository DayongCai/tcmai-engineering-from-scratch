'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, hanzi, sections,
  questions, biases, reportLayers, gates, caseParts, ethics, gapMath, audit,
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
  assert.ok(DOC.endsWith(path.join('chapters', '17-j17', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 17);
  assert.strictEqual(BODY.split('\n')[0], `# 第 17 章 · ${TITLE}`);
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).filter((s) => s.title).length, 6);
  assert.ok(new Set([...BODY.matchAll(/《([^》]+)》/g)].map((m) => m[1])).size >= 1);
});

test('四个问题与四种偏差', () => {
  assert.deepStrictEqual(A.qs, ['有没有效？', '对谁有效？', '怎么做到的？', '值不值？']);
  assert.deepStrictEqual(A.bs, ['选择偏差', '失访偏差', '时间偏差', '测量偏差']);
  assert.match(BODY, /用优等生的成绩评价老师/);
});

test('三层报法与四道门', () => {
  assert.deepStrictEqual(A.rl, ['过程', '中间结果', '安全']);
  assert.deepStrictEqual(A.gt, ['可复制', '可承受', '可嵌入', '可维持']);
  assert.match(BODY, /四道门的顺序不能颠倒/);
});

test('案例五段与伦理三让', () => {
  assert.deepStrictEqual(A.cp, ['情境', '判断', '动作', '变化', '反思']);
  assert.strictEqual(A.eth.length, 3);
  assert.match(A.eth[2], /结论要不夸大/);
});

test('归因复算：33 点差距收窄到 13 点，60.6% 由选择解释', () => {
  assert.deepStrictEqual(A.math, {
    files: 2400, a: 71, b: 38, better: 68, crude: 33, adjusted: 13, explained: 60.6,
  });
  assert.ok(A.math.explained > 50 && A.math.explained < 70);
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
  assert.match(r.stdout, /= 33 个百分点/);
  assert.match(r.stdout, /60\.6% 的差距由「谁更可能来」解释/);
  assert.match(r.stdout, /对账：一致/);
  assert.match(r.stdout, /不构成科研方法学指南/);
});

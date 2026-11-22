'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, analyze, sectionOf, crude, strata, composition, orInflation, maxVars, auditStructure, verify,
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
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '06-z136', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 6);
  assert.strictEqual(TITLE, '回归不是「控制变量」，是把混杂摊在桌面上');
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 6 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('正文统计可复算：汉字、节、加粗判断', () => {
  assert.strictEqual(A.hanzi, 2658);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.claims, 33);
});

test('粗效应复算：108/240 对 84/240 → OR 1.52、RR 1.29', () => {
  const c = crude();
  assert.strictEqual(c.jiaYes, 108);
  assert.strictEqual(c.guYes, 84);
  assert.strictEqual(c.or, 1.52);
  assert.strictEqual(c.rr, 1.29);
  assert.strictEqual(c.riskDiff, 10);
});

test('分层后每层 OR 都恰好 1.00——每层没有差异', () => {
  const s = strata();
  assert.strictEqual(s.light.or, 1);
  assert.strictEqual(s.severe.or, 1);
  assert.strictEqual(s.light.rJia, s.light.rGu);
  assert.strictEqual(s.severe.rJia, s.severe.rGu);
});

test('病情构成相反：加减组 62.5% 轻症，固定方组 37.5%', () => {
  const c = composition();
  assert.strictEqual(c.jiaLight, 62.5);
  assert.strictEqual(c.guLight, 37.5);
  assert.strictEqual(c.jiaLight + c.guLight, 100);
});

test('OR 对 RR 的夸大：1.18 倍；OR−1 只能读作「比值增加」', () => {
  const i = orInflation();
  assert.strictEqual(i.times, 1.18);
  assert.strictEqual(i.percent, 52);
  assert.match(BODY, /RR=1\.29、OR=1\.52/);
});

test('EPV 规则：192 个事件最多 19 个自变量', () => {
  assert.strictEqual(maxVars(), 19);
  assert.match(BODY, /最多容纳约 19 个自变量/);
});

test('结构四组齐：读法 3 种、替代解释 3 种、规则 3 条、前提 4 个', () => {
  const j = auditStructure(A.sections);
  assert.doesNotThrow(() => verify(j, crude(), strata(), composition(), orInflation()));
  assert.deepStrictEqual(j.readings, ['相关', '预测', '因果']);
  assert.deepStrictEqual(j.rivals, ['偶然', '混杂', '反向因果']);
  assert.strictEqual(j.rules.length, 3);
  assert.strictEqual(j.premises.length, 4);
  assert.strictEqual(j.balance, 2);
});

test('「回归经常让粗效应消失」与「调整后不说明无效」都在正文里', () => {
  const s3 = sectionOf(A.sections, '回归在做什么');
  assert.match(BODY, /它经常让一个漂亮的粗效应消失/);
  assert.match(BODY, /不说明「该方无效」/);
  assert.match(s3.text, /必须报告粗效应与调整效应两个数/);
});

test('quiz：≥5 题、三段齐、四选项、解释够长、答案打散', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const qs = quiz.questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  for (const s of ['pre', 'check', 'post']) assert.ok(qs.some((q) => q.stage === s), `缺 ${s} 段`);
  for (const q of qs) {
    assert.strictEqual(q.options.length, 4);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4);
    assert.ok(hanzi(q.explain) >= 30, `explain 只有 ${hanzi(q.explain)} 汉字`);
  }
  assert.ok(new Set(qs.map((q) => q.correct)).size >= 3, '正确答案过于集中');
});

test('quiz 的 check 题正确选项落在本章正文里（≥2 道）', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const body = shingles(BODY);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) => [...shingles(q.options[q.correct])].some((s) => body.has(s)));
  assert.ok(checks.length >= 3);
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
});

test('脚本可运行，输出含现算 OR 与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /粗 OR 1\.52 · RR 1\.29/);
  assert.match(r.stdout, /最多 19 个自变量/);
  assert.match(r.stdout, /不构成研究结论或临床建议/);
});

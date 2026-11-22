'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, hanzi, sections, splitTop,
  structureDims, grainFrame, replacements, replaceRules, herbTiers, observeItems, loadMath, audit,
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
  assert.ok(DOC.endsWith(path.join('chapters', '06-j6', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 6);
  assert.strictEqual(BODY.split('\n')[0], `# 第 6 章 · ${TITLE}`);
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).filter((s) => s.title).length, 6);
  assert.ok(new Set([...BODY.matchAll(/《([^》]+)》/g)].map((m) => m[1])).size >= 1);
});

test('结构四件事与《素问》四句比例框架', () => {
  assert.deepStrictEqual(A.dims.map((d) => d.dim), ['主食', '蛋白', '蔬果', '盐油与加工食品']);
  assert.match(A.dims[0].wrong, /完全不吃主食/);
  assert.deepStrictEqual(A.frame, ['五谷为养', '五果为助', '五畜为益', '五菜为充']);
});

test('替换动作五行，状态对动作，缺行即报', () => {
  assert.deepStrictEqual(A.repl.map((r) => r.state), ['偏寒', '湿重', '偏燥', '偏热', '气虚易疲']);
  assert.match(A.repl[0].action, /冰饮换常温或温热饮/);
  assert.match(A.repl[4].action, /主食 \+ 蛋白/);
});

test('替换三要求与药食三档', () => {
  assert.deepStrictEqual(A.rules, ['一次只换一处', '替换物必须买得到', '替换后口味要过得去']);
  assert.deepStrictEqual(A.tiers.map((t) => t.what), ['普通食品', '保健食品', '药品']);
});

test('效果观察项七项，都是可记录的项', () => {
  assert.strictEqual(A.observe.length, 7);
  assert.match(A.observe.join('/'), /排便频次与性状/);
  assert.match(A.observe.join('/'), /皮肤与睡眠的自我感受/);
  const banned = /排毒/;
  assert.ok(!A.observe.some((x) => banned.test(x)), '观察项里混进了无法验证的概念');
});

test('负荷复算：14 天 42 餐对 40 余种食材', () => {
  assert.deepStrictEqual(A.load, { days: 14, kinds: 40, meals: 42, perMeal: 0.95 });
  assert.ok(A.load.perMeal > 0.9, '每餐摊不到一种新食材，说明丰富度被低估');
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
  assert.match(r.stdout, /14 天 × 三餐 = 42 餐/);
  assert.match(r.stdout, /对账：一致/);
  assert.match(r.stdout, /不构成诊疗意见/);
});

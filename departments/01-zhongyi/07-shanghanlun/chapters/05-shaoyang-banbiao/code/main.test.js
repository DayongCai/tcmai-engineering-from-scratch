'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { normalize, search, shaoYang, contra, VARIANTS } = require('./main.js');

test('归一区分异体与通假：𤍠→热（异体）、嘿嘿→默默（通假）', () => {
  const r = normalize('往来寒𤍠，嘿嘿不欲饮食');
  assert.strictEqual(r.text, '往来寒热，默默不欲饮食');
  assert.deepStrictEqual(r.replaced.map((x) => x.type).sort(), ['异体', '通假']);
  assert.ok(VARIANTS.every((v) => ['异体', '通假'].includes(v.type)));
});

test('检索陷阱：「默默」raw 0 → 归一 3', () => {
  const r = search('默默不欲饮食');
  assert.deepStrictEqual([r.raw, r.normalized], [0, 3]);
});

test('两层陷阱叠加：「往来寒热」raw 5 → 归一 16', () => {
  const r = search('往来寒热');
  assert.deepStrictEqual([r.raw, r.normalized, r.missed], [5, 16, 11]);
});

test('OR 判定：任一证即立柴胡证（不必悉具）', () => {
  for (const k of ['往来寒热', '胸胁苦满', '默默不欲饮食', '心烦喜呕']) {
    const r = shaoYang({ [k]: true });
    assert.strictEqual(r.established, true, k);
    assert.match(r.why, /不必悉具/);
  }
});

test('四证皆无则不立证，并列出缺项；提纲三症不替代柴胡证', () => {
  const r = shaoYang({ 口苦: true, 咽干: true });
  assert.strictEqual(r.established, false);
  assert.deepStrictEqual(r.outline, ['口苦', '咽干']);
  assert.strictEqual(r.missing.length, 4);
});

test('三禁提示只在已施时出现，且「已下」保留原文许复与之说', () => {
  assert.deepStrictEqual(contra({}), []);
  const c = contra({ 已下: true });
  assert.strictEqual(c.length, 1);
  assert.match(c[0], /复与柴胡汤/);
});

// ── quiz 结构契约（与 scripts/check_chapter_exercises.js 同源）──
const { quizContract } = require('../../_quiz-contract.js');
quizContract(__dirname);

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const {
  chapterShape, fourDiagnosis, fakeSigns, pulseTradeoff, aiTraps, quantification, sources, sub,
  FAKE_NAMES, supplements } = require('./main.js');

test('正文 1,769 字 = 全书 8.0%：第13章 1,307 字 + 第14章·14.3 462 字', () => {
  const s = chapterShape();
  assert.strictEqual(s.c13.chars, 1307);
  assert.strictEqual(s.c143.chars, 462);
  assert.strictEqual(s.total, 1769);
  assert.ok(Math.abs(s.share - 1769 / 22215) < 1e-9);
  assert.ok(s.share > 0.079 && s.share < 0.081);
  assert.ok(s.shareOf14 > 0.21 && s.shareOf14 < 0.22, '14.3 占第14章 21.6%');
});

test('① 四诊不全：闻诊 855 字 = 全书 3.8%，是四诊里最薄的一诊（望诊的 30.4%）', () => {
  const d = fourDiagnosis();
  const by = Object.fromEntries(d.rows.map((r) => [r.name, r]));
  assert.strictEqual(by['闻诊'].chars, 855);
  assert.ok(Math.abs(by['闻诊'].share - 855 / 22215) < 1e-9);
  assert.strictEqual(by['望诊'].chars, 2812);
  assert.strictEqual(by['问诊'].chars, 2281);
  assert.strictEqual(by['切诊'].chars, 2030);
  assert.strictEqual(d.total, 7978);
  assert.strictEqual(d.thinnest, '闻诊');
  assert.strictEqual(d.thinnestChars, 855);
  assert.ok(d.ratioToThickest < 0.31 && d.ratioToThickest > 0.30);
});

test('② 假象正好五个：假神 + 四对真假，各自钉到节号', () => {
  const f = fakeSigns();
  assert.deepStrictEqual(f.map((x) => x.name), FAKE_NAMES);
  assert.strictEqual(f.length, 5);
  const by = Object.fromEntries(f.map((x) => [x.name, x]));
  // 假神是望神的假象，只在第2章；四对真假在第6章八纲
  assert.deepStrictEqual(by['假神'].chapters, ['2']);
  assert.deepStrictEqual(by['假神'].definedAt, ['2.1.1.2']);
  assert.deepStrictEqual(by['真寒假热'].definedAt, ['6.2.2.2']);
  assert.deepStrictEqual(by['真热假寒'].definedAt, ['6.2.2.2']);
  assert.deepStrictEqual(by['真实假虚'].definedAt, ['6.3.2.2']);
  assert.deepStrictEqual(by['真虚假实'].definedAt, ['6.3.2.2']);
  for (const x of f) assert.ok(sub(x.definedAt[0]), `${x.name} 的节号必须能解析`);
});

test('② 续：第14章的 AI 案例只点了两个假象，另两个不在 AI 案例里', () => {
  const by = Object.fromEntries(fakeSigns().map((x) => [x.name, x]));
  assert.ok(by['真寒假热'].inAi.includes('14.3.2'));
  assert.ok(by['真实假虚'].inAi.includes('14.3.2'));
  assert.deepStrictEqual(by['真热假寒'].inAi, []);
  assert.deepStrictEqual(by['真虚假实'].inAi, []);
  // 「真寒假热」最早出现于第1章的 AI 教学段，定义在第6章——两处不能混
  assert.strictEqual(by['真寒假热'].refs[0], '1.4.2');
  assert.ok(by['真寒假热'].chapters.includes('14'));
});

test('③ 脉症从舍：5.1.4.1 共 108 字，顺逆 + 两种从舍，各一例，没有优先级规则', () => {
  const p = pulseTradeoff();
  assert.strictEqual(p.ref, '5.1.4.1');
  assert.strictEqual(p.chapter, '5');
  assert.strictEqual(p.chars, 108);
  assert.strictEqual(p.hasShun, true);
  assert.strictEqual(p.hasNi, true);
  assert.strictEqual(p.hasSheMai, true);
  assert.strictEqual(p.hasSheZheng, true);
  assert.deepStrictEqual(p.rules, ['舍脉从症', '舍症从脉']);
  assert.ok(p.text.includes('真热假寒'), '舍脉从症的例子用的是真热假寒');
  assert.ok(!/优先|权重|几分/.test(p.text), '教材没给谁优先的规则');
});

test('④ AI 误判：14.3.2 三案例 + 双轨复核，且教材文本第二段截断（断在「方可进」）', () => {
  const a = aiTraps();
  assert.strictEqual(a.ref, '14.3.2');
  assert.strictEqual(a.chars, 175);
  assert.deepStrictEqual(a.paraLens, [136, 39]);
  assert.deepStrictEqual(a.cases.map((c) => c.name), ['真寒假热', '真实假虚', '血瘀兼证遗漏']);
  assert.strictEqual(a.cases[0].ignore, '舌淡脉微');
  assert.strictEqual(a.cases[1].ignore, '苔黄腹满');
  assert.strictEqual(a.hasDualTrack, true);
  assert.strictEqual(a.truncated, true);
  assert.ok(a.tail.endsWith('方可进'));
  assert.ok(sub('14.3.2'), '14.3.2 必须能解析');
});

test('误差率零证据：全书 0 个百分比数值，只有四个「率」的名称', () => {
  const q = quantification();
  assert.deepStrictEqual(q.percentTokens, []);
  assert.strictEqual(q.numericRates, 0);
  assert.strictEqual(q.hasErrorRate, false);
  const terms = Object.fromEntries(q.terms.map((t) => [t.term, t.ref]));
  assert.strictEqual(terms['敏感度'], '14.2.2');
  assert.strictEqual(terms['特异度'], '14.2.2');
  assert.strictEqual(terms['正确率'], '14.3.1');
  assert.strictEqual(terms['准确率'], '14.4.2');
  for (const bad of ['误诊率', '漏诊率', '一致率', '符合率', 'Kappa']) {
    assert.ok(!q.termNames.includes(bad), `教材没出现「${bad}」`);
  }
});

test('四条来源都是结构索引，没有一条带概率；每条 refs 可解析', () => {
  const s = sources();
  assert.strictEqual(s.length, 4);
  assert.deepStrictEqual(s.map((x) => x.key), ['四诊不全', '假象', '脉症从舍', 'AI 误判与双轨复核']);
  for (const x of s) {
    assert.strictEqual(x.quantified, false, `${x.key} 不许带数值`);
    assert.ok(x.refs.length >= 1);
    for (const r of x.refs) assert.ok(sub(r), `${x.key} 的 ${r} 解析失败`);
  }
  assert.deepStrictEqual(s[3].refs, ['14.3.2']);
});

test('补录：误差率拒补，理由与替代口径齐', () => {
  const g = supplements('z4-wucha-lu');
  assert.strictEqual(g.refused, true, '必须标为拒补');
  assert.ok(g.reason.includes('伪造'), '理由要写明为什么不许用古籍凑');
  assert.ok(g.alternative.includes('现代研究'), '要给替代口径');
  assert.strictEqual(g.entries, undefined, '拒补项不得列条目');
});

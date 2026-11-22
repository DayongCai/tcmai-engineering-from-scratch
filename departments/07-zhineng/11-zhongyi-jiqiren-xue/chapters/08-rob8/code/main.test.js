'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, pressureKpa, relativeFlux, verdict, analyze,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const BODY = read();
const X = analyze(BODY);

test('正文就在本章目录下，首行章题与章节元数据一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '08-rob8', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 8);
  assert.ok(BODY.startsWith('# 第 8 章 · ' + TITLE), '正文首行与章题不一致');
  assert.strictEqual(X.hasTitle, true);
});

test('三条判据：可参数化 / 可测量 / 可逆', () => {
  assert.strictEqual(X.criteria.length, 3);
  assert.deepStrictEqual(X.criteria.map((c) => c.name), ['可参数化', '可测量', '可逆']);
  assert.match(X.criteria[2].otherwise, /风险不可接受/);
});

test('手法表七行，判定按四档分类：3 / 2 / 1 / 1', () => {
  assert.strictEqual(X.techniques.length, 7);
  assert.deepStrictEqual(
    X.techniques.map((t) => t.name.replace(/（.*?）/g, '')),
    ['按法', '揉法', '㨰法', '点按', '振法', '牵抖', '扳法'],
  );
  assert.deepStrictEqual(X.counts, { 可自动化: 3, 受限: 2, 不可自动化: 1, 禁止自动化: 1 });
  assert.deepStrictEqual(
    X.techniques.filter((t) => t.verdict === '可自动化').map((t) => t.name.replace(/（.*?）/g, '')),
    ['按法', '揉法', '㨰法'],
  );
});

test('扳法禁止自动化、牵抖不可自动化，两者都因可逆不成立', () => {
  const ban = X.techniques.find((t) => t.name.includes('扳法'));
  const pull = X.techniques.find((t) => t.name.includes('牵抖'));
  assert.strictEqual(ban.verdict, '禁止自动化');
  assert.strictEqual(pull.verdict, '不可自动化');
  for (const t of [ban, pull]) assert.match(t.reversible, /否/);
  // 判定函数本身不被 Markdown 装饰影响
  assert.strictEqual(verdict('**禁止自动化**'), '禁止自动化');
  assert.strictEqual(verdict('可自动化（需专用末端）'), '可自动化');
  assert.strictEqual(verdict('受限（需硬限幅）'), '受限');
});

test('同样的 20 N：4 cm² 得 50 kPa，1 cm² 得 200 kPa，差 4 倍', () => {
  assert.strictEqual(X.force, 20);
  assert.strictEqual(X.areaBig, 4);
  assert.strictEqual(X.areaSmall, 1);
  assert.ok(Math.abs(X.kPaBig - 50) < 1e-9, `大接触面 ${X.kPaBig}`);
  assert.ok(Math.abs(X.kPaSmall - 200) < 1e-9, `小接触面 ${X.kPaSmall}`);
  assert.strictEqual(X.kPaBig, X.kPaBigDoc);
  assert.strictEqual(X.kPaSmall, X.kPaSmallDoc);
  assert.strictEqual(X.kPaSmall / X.kPaBig, 4);
  assert.ok(Math.abs(pressureKpa(20, 1) - 200) < 1e-9);
});

test('灸距平方反比：3 cm 为 8 °C，2/4/5 cm 分别 18.0 / 4.5 / 2.9 °C', () => {
  assert.strictEqual(X.d0, 3);
  assert.strictEqual(X.rise0, 8);
  assert.deepStrictEqual(X.moxa.map((m) => m.d), [2, 3, 4, 5]);
  assert.deepStrictEqual(X.moxa.map((m) => m.doc.rise), [18, 8, 4.5, 2.9]);
  for (const m of X.moxa) {
    assert.ok(m.fluxResidual < 0.005, `d=${m.d} 相对热流偏差 ${m.fluxResidual}`);
    assert.ok(m.riseResidual < 0.05, `d=${m.d} 温升偏差 ${m.riseResidual}`);
  }
  assert.ok(Math.abs(relativeFlux(2, 3) - 2.25) < 1e-12);
  assert.strictEqual(X.moxa[0].model.rise, 18);
  // 距离减半不止翻倍：温升涨 2.25 倍
  assert.ok(X.moxa[0].model.rise / X.moxa[1].model.rise > 2);
});

test('两张清单各五条：能做的与不能做的', () => {
  assert.strictEqual(X.canDo.length, 5);
  assert.strictEqual(X.cannotDo.length, 5);
  assert.ok(X.canDo.some((s) => s.includes('复现')));
  assert.ok(X.cannotDo.some((s) => s.includes('得气')));
  assert.ok(X.cannotDo.some((s) => s.includes('疗效')));
});

test('脚本可运行，输出带现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成诊疗建议或疗效声明/);
  assert.ok(out.includes('可自动化 3'));
  assert.ok(out.includes('200 kPa'));
  assert.ok(!out.includes('**'), '输出不应残留 Markdown 粗体标记');
});

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { DOC, CHAPTER, TITLE, read, sections, concepts, motivation, raiseOnly, equity, performance, arousal } = require('./main.js');

const TEXT = read();

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '08-p8', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 8);
  assert.strictEqual(TITLE, '激励失效，几乎总是三处之一断了：不信、不值、不公平');
  assert.strictEqual(sections(TEXT).length, 6);
});

test('四套内容型与四套过程型理论逐条命中', () => {
  const c = concepts(TEXT);
  assert.deepStrictEqual(c.content, ['马斯洛', '赫茨伯格', '麦克利兰', '奥尔德弗']);
  assert.deepStrictEqual(c.process, ['期望理论', '公平理论', '目标设置理论', '自我决定理论']);
  assert.strictEqual(c.hygiene.length, 7);
  assert.strictEqual(c.motivators.length, 5);
  assert.strictEqual(c.restore.length, 5);
});

test('期望理论是三要素相乘，最弱一环可定位', () => {
  const m = motivation({ expectancy: 0.35, instrumentality: 0.4, valence: 0.9 });
  assert.strictEqual(m.m, 0.126);
  assert.strictEqual(m.weakest, '期望');
  assert.strictEqual(motivation({ expectancy: 0.9, instrumentality: 0.1, valence: 1 }).weakest, '工具性');
  assert.strictEqual(motivation({ expectancy: 0, instrumentality: 1, valence: 1 }).m, 0);
  assert.match(motivation({ expectancy: 0, instrumentality: 1, valence: 1 }).verdict, /加钱无效/);
});

test('只加 12% 奖金：乘积从 0.126 只升到 0.14', () => {
  const r = raiseOnly({ expectancy: 0.35, instrumentality: 0.4, valence: 0.9 }, 0.12);
  assert.strictEqual(r.before, 0.126);
  assert.strictEqual(r.after, 0.14);
  assert.strictEqual(r.delta, 0.014);
  // 同样幅度的期望改善，效果大得多
  assert.ok(motivation({ expectancy: 0.5, instrumentality: 0.4, valence: 0.9 }).m > 0.126);
});

test('公平比值：欠酬时给出五种恢复策略', () => {
  const e = equity(100, 10, 120, 10);
  assert.strictEqual(e.ratio, 0.8333);
  assert.strictEqual(e.state, '欠酬不公平');
  assert.strictEqual(e.strategies.length, 5);
  assert.strictEqual(equity(120, 10, 120, 10).state, '公平');
  assert.strictEqual(equity(150, 10, 120, 10).state, '过酬不公平');
  assert.deepStrictEqual(equity(120, 10, 120, 10).strategies, []);
});

test('绩效乘法：机会为零则整体为零，并指出先查哪一项', () => {
  const p = performance({ ability: 0.9, motivation: 0.8, opportunity: 0 });
  assert.strictEqual(p.value, 0);
  assert.deepStrictEqual(p.zeros, ['机会']);
  assert.match(p.verdict, /先查机会/);
  assert.strictEqual(performance({ ability: 0.9, motivation: 0.8, opportunity: 1 }).value, 0.72);
});

test('倒 U 型：复杂任务的峰值低于简单任务', () => {
  assert.ok(arousal(0.5, 0.9).peak < arousal(0.5, 0.1).peak);
  assert.strictEqual(arousal(0.5, 0.9).peak, 0.34);
  assert.strictEqual(arousal(0.5, 0.1).peak, 0.66);
});

test('脚本可运行，输出乘法结构与诊断顺序声明', () => {
  const r = require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /M = 0\.35 × 0\.4 × 0\.9 = 0\.126/);
  assert.match(out, /欠酬不公平/);
  assert.match(out, /最弱一环：期望/);
  assert.match(out, /理论是概率命题/);
});

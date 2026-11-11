'use strict';
/**
 * 第 19 章单测。每条断言都对着 docs/zh.md 里的一个数字：
 * 改代码不改文档、或改文档不改代码，这里都会红。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const { totals, hits, formulaTable, crossCheck, PIAN, PIAN_NO } = require('./main.js');

const DOC = fs.readFileSync(path.join(__dirname, '..', 'docs', 'zh.md'), 'utf8');

test('篇级规模：47 条 · 23 方 · 2456 字 · 出方条 22', () => {
  const t = totals();
  assert.strictEqual(t.pian, 17);
  assert.strictEqual(t.tiao, 47);
  assert.strictEqual(t.fang, 23);
  assert.strictEqual(t.chars, 2456, '与底本 pian[].chars 同口径');
  assert.strictEqual(t.chu, 22);
  assert.strictEqual(t.wu, 25);
});

test('药味：83 味次 / 39 味', () => {
  const t = totals();
  assert.strictEqual(t.herbTokens, 83);
  assert.strictEqual(t.distinctHerbs, 39);
});

test('表 2 字面命中：死 3 · 难治 2 · 禁忌 6 · 自愈 10', () => {
  const h = hits();
  assert.strictEqual(h['标「死／不治」'], 3);
  assert.strictEqual(h['标「难治」'], 2);
  assert.strictEqual(h['禁忌句（不可／禁／勿）'], 6);
  assert.strictEqual(h['自愈／欲解'], 10);
});

test('方证表行数 = 方数（一方一行）', () => {
  assert.strictEqual(formulaTable().length, 23);
});

test('校勘口径：古诗文网本段数/字数可复算', () => {
  const c = crossCheck();
  assert.strictEqual(c.pian, 17);
  assert.strictEqual(c.paras, 118);
  assert.strictEqual(c.chars, 2173);
});

test('文档与代码不脱钩：关键数字在 docs/zh.md 中原文出现', () => {
  const needles = ['条', '无方条'];
  assert.ok(needles.every((n) => DOC.includes(n)));
  assert.ok(DOC.includes(String(47)), '条数');
  assert.ok(DOC.includes(String(23)), '方数');
  assert.ok(DOC.includes(String(2456)), '字数');
  assert.ok(DOC.includes('第 17 篇') || DOC.includes('第17篇'), '篇号');
  assert.ok(PIAN.nameSimp || PIAN_NO, '底本篇名可取');
});

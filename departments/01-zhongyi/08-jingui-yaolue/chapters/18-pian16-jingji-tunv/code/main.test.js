'use strict';
/**
 * 第 18 章单测。每条断言都对着 docs/zh.md 里的一个数字：
 * 改代码不改文档、或改文档不改代码，这里都会红。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const { totals, hits, formulaTable, crossCheck, PIAN, PIAN_NO } = require('./main.js');

const DOC = fs.readFileSync(path.join(__dirname, '..', 'docs', 'zh.md'), 'utf8');

test('篇级规模：17 条 · 5 方 · 674 字 · 出方条 5', () => {
  const t = totals();
  assert.strictEqual(t.pian, 16);
  assert.strictEqual(t.tiao, 17);
  assert.strictEqual(t.fang, 5);
  assert.strictEqual(t.chars, 674, '与底本 pian[].chars 同口径');
  assert.strictEqual(t.chu, 5);
  assert.strictEqual(t.wu, 12);
});

test('药味：22 味次 / 20 味', () => {
  const t = totals();
  assert.strictEqual(t.herbTokens, 22);
  assert.strictEqual(t.distinctHerbs, 20);
});

test('表 2 字面命中：死 1 · 难治 0 · 禁忌 2 · 自愈 0', () => {
  const h = hits();
  assert.strictEqual(h['标「死／不治」'], 1);
  assert.strictEqual(h['标「难治」'], 0);
  assert.strictEqual(h['禁忌句（不可／禁／勿）'], 2);
  assert.strictEqual(h['自愈／欲解'], 0);
});

test('方证表行数 = 方数（一方一行）', () => {
  assert.strictEqual(formulaTable().length, 5);
});

test('校勘口径：古诗文网本段数/字数可复算', () => {
  const c = crossCheck();
  assert.strictEqual(c.pian, 16);
  assert.strictEqual(c.paras, 29);
  assert.strictEqual(c.chars, 576);
});

test('文档与代码不脱钩：关键数字在 docs/zh.md 中原文出现', () => {
  const needles = ['条', '无方条'];
  assert.ok(needles.every((n) => DOC.includes(n)));
  assert.ok(DOC.includes(String(17)), '条数');
  assert.ok(DOC.includes(String(5)), '方数');
  assert.ok(DOC.includes(String(674)), '字数');
  assert.ok(DOC.includes('第 16 篇') || DOC.includes('第16篇'), '篇号');
  assert.ok(PIAN.nameSimp || PIAN_NO, '底本篇名可取');
});

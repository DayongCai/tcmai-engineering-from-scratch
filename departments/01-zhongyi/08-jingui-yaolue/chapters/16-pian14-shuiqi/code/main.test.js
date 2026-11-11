'use strict';
/**
 * 第 16 章单测。每条断言都对着 docs/zh.md 里的一个数字：
 * 改代码不改文档、或改文档不改代码，这里都会红。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const { totals, hits, formulaTable, crossCheck, PIAN, PIAN_NO } = require('./main.js');

const DOC = fs.readFileSync(path.join(__dirname, '..', 'docs', 'zh.md'), 'utf8');

test('篇级规模：32 条 · 9 方 · 2617 字 · 出方条 7', () => {
  const t = totals();
  assert.strictEqual(t.pian, 14);
  assert.strictEqual(t.tiao, 32);
  assert.strictEqual(t.fang, 9);
  assert.strictEqual(t.chars, 2617, '与底本 pian[].chars 同口径');
  assert.strictEqual(t.chu, 7);
  assert.strictEqual(t.wu, 25);
});

test('药味：27 味次 / 14 味', () => {
  const t = totals();
  assert.strictEqual(t.herbTokens, 27);
  assert.strictEqual(t.distinctHerbs, 14);
});

test('表 2 字面命中：死 1 · 难治 1 · 禁忌 1 · 自愈 4', () => {
  const h = hits();
  assert.strictEqual(h['标「死／不治」'], 1);
  assert.strictEqual(h['标「难治」'], 1);
  assert.strictEqual(h['禁忌句（不可／禁／勿）'], 1);
  assert.strictEqual(h['自愈／欲解'], 4);
});

test('方证表行数 = 方数（一方一行）', () => {
  assert.strictEqual(formulaTable().length, 9);
});

test('校勘口径：古诗文网本段数/字数可复算', () => {
  const c = crossCheck();
  assert.strictEqual(c.pian, 14);
  assert.strictEqual(c.paras, 57);
  assert.strictEqual(c.chars, 2192);
});

test('文档与代码不脱钩：关键数字在 docs/zh.md 中原文出现', () => {
  const needles = ['条', '无方条'];
  assert.ok(needles.every((n) => DOC.includes(n)));
  assert.ok(DOC.includes(String(32)), '条数');
  assert.ok(DOC.includes(String(9)), '方数');
  assert.ok(DOC.includes(String(2617)), '字数');
  assert.ok(DOC.includes('第 14 篇') || DOC.includes('第14篇'), '篇号');
  assert.ok(PIAN.nameSimp || PIAN_NO, '底本篇名可取');
});

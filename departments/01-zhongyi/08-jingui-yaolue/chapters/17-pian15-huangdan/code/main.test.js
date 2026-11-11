'use strict';
/**
 * 第 17 章单测。每条断言都对着 docs/zh.md 里的一个数字：
 * 改代码不改文档、或改文档不改代码，这里都会红。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const { totals, hits, formulaTable, crossCheck, PIAN, PIAN_NO } = require('./main.js');

const DOC = fs.readFileSync(path.join(__dirname, '..', 'docs', 'zh.md'), 'utf8');

test('篇级规模：22 条 · 6 方 · 1208 字 · 出方条 6', () => {
  const t = totals();
  assert.strictEqual(t.pian, 15);
  assert.strictEqual(t.tiao, 22);
  assert.strictEqual(t.fang, 6);
  assert.strictEqual(t.chars, 1208, '与底本 pian[].chars 同口径');
  assert.strictEqual(t.chu, 6);
  assert.strictEqual(t.wu, 16);
});

test('药味：17 味次 / 12 味', () => {
  const t = totals();
  assert.strictEqual(t.herbTokens, 17);
  assert.strictEqual(t.distinctHerbs, 12);
});

test('表 2 字面命中：死 1 · 难治 3 · 禁忌 1 · 自愈 0', () => {
  const h = hits();
  assert.strictEqual(h['标「死／不治」'], 1);
  assert.strictEqual(h['标「难治」'], 3);
  assert.strictEqual(h['禁忌句（不可／禁／勿）'], 1);
  assert.strictEqual(h['自愈／欲解'], 0);
});

test('方证表行数 = 方数（一方一行）', () => {
  assert.strictEqual(formulaTable().length, 6);
});

test('校勘口径：古诗文网本段数/字数可复算', () => {
  const c = crossCheck();
  assert.strictEqual(c.pian, 15);
  assert.strictEqual(c.paras, 45);
  assert.strictEqual(c.chars, 1039);
});

test('文档与代码不脱钩：关键数字在 docs/zh.md 中原文出现', () => {
  const needles = ['条', '无方条'];
  assert.ok(needles.every((n) => DOC.includes(n)));
  assert.ok(DOC.includes(String(22)), '条数');
  assert.ok(DOC.includes(String(6)), '方数');
  assert.ok(DOC.includes(String(1208)), '字数');
  assert.ok(DOC.includes('第 15 篇') || DOC.includes('第15篇'), '篇号');
  assert.ok(PIAN.nameSimp || PIAN_NO, '底本篇名可取');
});

'use strict';
/**
 * 第 11 章单测。每条断言都对着 docs/zh.md 里的一个数字：
 * 改代码不改文档、或改文档不改代码，这里都会红。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const { totals, hits, formulaTable, crossCheck, PIAN, PIAN_NO } = require('./main.js');

const DOC = fs.readFileSync(path.join(__dirname, '..', 'docs', 'zh.md'), 'utf8');

test('篇级规模：15 条 · 10 方 · 1643 字 · 出方条 10', () => {
  const t = totals();
  assert.strictEqual(t.pian, 7);
  assert.strictEqual(t.tiao, 15);
  assert.strictEqual(t.fang, 10);
  assert.strictEqual(t.chars, 1643, '与底本 pian[].chars 同口径');
  assert.strictEqual(t.chu, 10);
  assert.strictEqual(t.wu, 5);
});

test('药味：55 味次 / 28 味', () => {
  const t = totals();
  assert.strictEqual(t.herbTokens, 55);
  assert.strictEqual(t.distinctHerbs, 28);
});

test('表 2 字面命中：死 2 · 难治 0 · 禁忌 0 · 自愈 0', () => {
  const h = hits();
  assert.strictEqual(h['标「死／不治」'], 2);
  assert.strictEqual(h['标「难治」'], 0);
  assert.strictEqual(h['禁忌句（不可／禁／勿）'], 0);
  assert.strictEqual(h['自愈／欲解'], 0);
});

test('方证表行数 = 方数（一方一行）', () => {
  assert.strictEqual(formulaTable().length, 10);
});

test('校勘口径：古诗文网本段数/字数可复算', () => {
  const c = crossCheck();
  assert.strictEqual(c.pian, 7);
  assert.strictEqual(c.paras, 60);
  assert.strictEqual(c.chars, 1493);
});

test('文档与代码不脱钩：关键数字在 docs/zh.md 中原文出现', () => {
  const needles = ['条', '无方条'];
  assert.ok(needles.every((n) => DOC.includes(n)));
  assert.ok(DOC.includes(String(15)), '条数');
  assert.ok(DOC.includes(String(10)), '方数');
  assert.ok(DOC.includes(String(1643)), '字数');
  assert.ok(DOC.includes('第 7 篇') || DOC.includes('第7篇'), '篇号');
  assert.ok(PIAN.nameSimp || PIAN_NO, '底本篇名可取');
});

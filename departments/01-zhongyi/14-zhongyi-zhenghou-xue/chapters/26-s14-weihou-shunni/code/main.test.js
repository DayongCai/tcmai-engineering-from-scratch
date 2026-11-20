#!/usr/bin/env node
/**
 * 第 26 章 危候与顺逆：词面判据能做与不能做的事 单元测试：断言全部从母本现算，不写死数字。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const lib = require('./main.js');

const g = lib.load.gl();
const st = lib.load.struct();
const un = lib.load.units();
const s = lib.stats();

test('本章覆盖的概论节都在母本里', () => {
  assert.deepStrictEqual(s.secs, lib.SECS);
  for (const no of lib.SECS) assert.ok(g.sections.some((x) => x.no === no), '概论缺第 ' + no + ' 节');
});

test('概论字数与逐节相加一致', () => {
  const manual = g.sections.filter((x) => lib.SECS.includes(x.no)).reduce((a, x) => a + (x.chars || 0), 0);
  assert.strictEqual(s.sectionChars, manual);
  assert.ok(s.sectionChars > 300, '本章概论字数过少：' + s.sectionChars);
});

test('单元数与 units.json 的逐条遍历一致', () => {
  const manual = lib.chapterUnits(un).units.length;
  assert.strictEqual(s.units, manual);
  assert.ok(s.units >= 1);
});

test('每个 locator 都能在 units.json 里回查', () => {
  const all = new Set(un.units.map((u) => u.locator));
  for (const loc of s.locators) assert.ok(all.has(loc), '回查不到单元 ' + loc);
});

test('辞典规模口径与结构.json 同源', () => {
  assert.strictEqual(s.book.men, st.counts.men);
  assert.strictEqual(s.book.hou, st.counts.houInstances);
  assert.ok(s.book.zheng >= s.book.men);
});

test('正文里的免责与边界声明存在', () => {
  const p = require('node:path').join(__dirname, '..', 'docs', 'zh.md');
  const md = require('node:fs').readFileSync(p, 'utf8');
  assert.ok(md.includes('不构成诊疗建议'), '缺免责声明');
  assert.ok(md.includes('概论原文'), '缺原文锚点一节');
});

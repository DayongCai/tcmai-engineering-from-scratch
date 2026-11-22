'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  readDoc, loadUnits, summarize, docClaims, reconcile, DOC_PATH, UNITS_PATH,
} = require('./main.js');

test('正文与单元层数据源都可读', () => {
  assert.ok(fs.existsSync(DOC_PATH));
  assert.ok(fs.existsSync(UNITS_PATH));
  const body = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  assert.ok(body.includes('/chapters/18-k18/docs/zh.md'));
});

test('单元层现算：18 章、198 单元、每章 11 单元', () => {
  const s = summarize(loadUnits().units);
  assert.strictEqual(s.chapters, 18);
  assert.strictEqual(s.units, 198);
  assert.strictEqual(s.unitsPerChapter, 11);
});

test('汉字总数与每单元平均字', () => {
  const s = summarize(loadUnits().units);
  assert.strictEqual(s.hanzi, 300568);
  assert.ok(Math.abs(s.perUnit - 1518.02) < 0.01);
});

test('章汉字区间与极差可复算', () => {
  const s = summarize(loadUnits().units);
  assert.strictEqual(s.minChapter, 15422);
  assert.strictEqual(s.maxChapter, 17712);
  assert.strictEqual(s.spread, 2290);
  assert.ok(Math.abs(s.spreadRate - 14.85) < 0.05);
});

test('正文所写的章数与单元数与数据源一致', () => {
  const doc = readDoc();
  const c = docClaims(doc);
  assert.strictEqual(c.chapters, 18);
  assert.strictEqual(c.units, 198);
  assert.strictEqual(c.hanzi, 300568);
});

test('正文与真源逐项对得上（无可复算缺口）', () => {
  const doc = readDoc();
  const s = summarize(loadUnits().units);
  const r = reconcile(doc, s);
  assert.deepStrictEqual(r.mismatches, []);
  assert.strictEqual(r.claims.perUnit, 1518);
  assert.strictEqual(r.claims.rangeLow, 15422);
  assert.strictEqual(r.claims.rangeHigh, 17712);
  assert.strictEqual(r.claims.spread, 2290);
});

test('脚本可运行，输出含现算结果与比对结论', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /现算：18 章、198 单元、300,568 汉字/);
  assert.match(out, /章汉字区间 15,422 — 17,712/);
  assert.match(out, /不是演算设定/);
});

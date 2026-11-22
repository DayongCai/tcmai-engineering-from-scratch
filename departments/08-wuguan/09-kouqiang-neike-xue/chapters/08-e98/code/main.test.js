'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const m = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const CHAPTERS = path.join(__dirname, '..', '..', '..', 'chapters.json');

test('章节号与课程清单一致', () => {
  const list = JSON.parse(fs.readFileSync(CHAPTERS, 'utf8')).chapters;
  const row = list.find((c) => c.slug === m.SLUG);
  assert.ok(row, `chapters.json 里没有 ${m.SLUG}`);
  assert.strictEqual(row.n, m.CHAPTER);
  assert.strictEqual(m.audit().title, row.title);
});

test('三个落点都在正文里', () => {
  assert.deepStrictEqual(m.audit().layers, m.LAYERS);
});

test('病名表六行，每行都标了落点', () => {
  const a = m.audit();
  assert.strictEqual(a.diseaseRows, 6);
  for (const l of a.diseaseLayers) assert.ok(l && l.length > 0, '病名缺落点');
});

test('七条红线', () => {
  assert.strictEqual(m.audit().redLines, 7);
});

test('五型与三个动作都在正文里', () => {
  const a = m.audit();
  assert.deepStrictEqual(a.types, m.TYPES);
  assert.deepStrictEqual(a.actions, m.ACTIONS);
});

test('两条边界写明', () => {
  const a = m.audit();
  assert.ok(a.hardnessIsDepth);
  assert.ok(a.noPercentage);
});

test('脚本可运行且带边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /教学样例/);
  assert.match(r.stdout, /不构成临床判断依据/);
});

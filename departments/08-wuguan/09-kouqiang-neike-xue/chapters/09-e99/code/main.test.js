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

test('口气四层，顺序与正文一致', () => {
  const a = m.audit();
  assert.strictEqual(a.breathRows, 4);
  assert.deepStrictEqual(a.breathLayers, m.BREATH_LAYERS);
});

test('口干三路都在表里', () => {
  const a = m.audit();
  assert.strictEqual(a.dryRows, 3);
  assert.deepStrictEqual(a.dryPaths, m.DRY_PATHS);
});

test('诊室三个动作与四个自查按正文计数', () => {
  const a = m.audit();
  assert.strictEqual(a.roomSteps, 3);
  assert.strictEqual(a.selfChecks, 4);
});

test('下游链与三条转诊触发都在正文里', () => {
  const a = m.audit();
  assert.ok(a.chain >= 7, `下游链只有 ${a.chain} 段`);
  assert.deepStrictEqual(a.exits, m.EXIT_TRIGGERS);
});

test('先数药与假性口臭两条都写明', () => {
  const a = m.audit();
  assert.ok(a.medicineFirst);
  assert.ok(a.pseudo);
});

test('脚本可运行且带边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /教学样例/);
  assert.match(r.stdout, /不构成临床判断依据/);
});

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

test('正文可读，小节齐全', () => {
  assert.ok(m.audit().sections.length >= 6, '小节过少');
});

test('五条规则齐备且次序不倒', () => {
  const a = m.audit();
  assert.deepStrictEqual(a.rules, ['刷牙', '牙线', '舌苔', '饮食', '随访']);
  assert.ok(a.rulesOrdered, '五条次序与正文不符');
});

test('刷牙动作要点：45 度、两分钟、每日两次都在', () => {
  assert.strictEqual(m.audit().actions.length, 3);
});

test('三级预防表三行、三句话说反的话齐备', () => {
  const a = m.audit();
  assert.strictEqual(a.levels, 3);
  assert.strictEqual(a.say3, 3);
});

test('有靶点的忌口四条，「多喝水」不解决口腔干燥', () => {
  const a = m.audit();
  assert.strictEqual(a.targets.length, 4);
  assert.ok(a.waterOk, '正文缺「多喝水／不在三步里」');
});

test('脚本可运行且带边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /教学样例/);
  assert.match(r.stdout, /不给疗效承诺/);
});

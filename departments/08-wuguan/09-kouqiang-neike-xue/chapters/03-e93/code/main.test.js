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

test('正文可读，小节都在', () => {
  assert.ok(m.audit().sections.length >= 6);
});

test('三种火与虚的四层都能在正文找到', () => {
  const a = m.audit();
  assert.deepStrictEqual(a.fires.map((f) => f.name), m.FIRES);
  for (const f of a.fires) assert.ok(f.n > 0, `${f.name} 未出现`);
  assert.deepStrictEqual(a.deficiencies, m.DEFICIENCIES);
});

test('阴火的四证门槛至少命中三条', () => {
  const a = m.audit();
  assert.ok(a.gatesOk, `只命中 ${a.gates.length} 条：${a.gates.join('、')}`);
});

test('判据次序与正文一致', () => {
  assert.ok(m.audit().orderOk, '正文的判据次序与本章判据不符');
});

test('齿在质、龈在肉的分叉与清热约束都在正文里', () => {
  const a = m.audit();
  assert.ok(a.toothVsGum);
  assert.deepStrictEqual(a.constraints, m.CONSTRAINTS);
  assert.ok(a.notSameAsAcute);
});

test('脚本可运行且带边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /教学样例/);
  assert.match(r.stdout, /不构成临床判断依据/);
});

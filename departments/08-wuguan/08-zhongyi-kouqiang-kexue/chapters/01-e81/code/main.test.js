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

test('概念表八行，每行三列', () => {
  const a = m.audit();
  assert.strictEqual(a.tableRows, 8);
  assert.ok(a.tableWidthOk, '有表行不是「概念／出处／一句定义」三列');
});

test('六部位与涎唾、会厌都能在正文找到', () => {
  const a = m.audit();
  assert.deepStrictEqual(a.missing, []);
  assert.strictEqual(a.parts.length, 6);
  assert.strictEqual(a.liquids.length, 2);
  assert.strictEqual(a.gates.length, 2);
});

test('上龈属胃、下龈属大肠，两句都在正文', () => {
  const doc = m.readDoc();
  for (const line of m.GUM_LINES) assert.ok(doc.includes(line), `正文缺：${line}`);
});

test('轻重次序与正文一致', () => {
  assert.ok(m.audit().orderOk, '「先保气通，再论纳食」的次序与正文不符');
});

test('引书含《灵枢·经脉》与《口齒類要》', () => {
  const books = m.audit().books;
  assert.ok(books.some((b) => b.includes('灵枢·经脉')));
  assert.ok(books.some((b) => b.includes('口齒類要')));
});

test('脚本可运行且带边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /教学样例/);
  assert.match(r.stdout, /不构成诊断或治疗依据/);
  assert.match(r.stdout, /本章不给剂量/);
});

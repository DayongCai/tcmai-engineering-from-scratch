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

test('病因四路都在，且按阳明—少阴—湿热—错杂排下来', () => {
  const a = m.audit();
  assert.strictEqual(a.routes.length, 4);
  assert.ok(a.routesOrdered, '四路次序与正文不符');
});

test('「火」在正文里是三种，不是一种', () => {
  const a = m.audit();
  assert.deepStrictEqual(a.fire.map((f) => f.name), m.FIRE);
});

test('病机三轴与三条走向都能在正文找到', () => {
  const a = m.audit();
  assert.deepStrictEqual(a.axes, ['壅', '腐', '损']);
  assert.ok(a.trendOk, '走向次序与正文不符');
});

test('风热与风寒的三处鉴别齐备', () => {
  assert.ok(m.audit().pairsOk, '「先肿后痛／先痛后肿」等鉴别缺项');
});

test('热象不等于热证一句在正文', () => {
  assert.ok(m.readDoc().includes('热象不等于热证'));
});

test('脚本可运行且带边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /教学样例/);
  assert.match(r.stdout, /本章不给剂量/);
});

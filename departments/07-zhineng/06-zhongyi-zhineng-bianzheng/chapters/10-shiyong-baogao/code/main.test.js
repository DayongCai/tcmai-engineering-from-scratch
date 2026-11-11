'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const MAP = path.join(__dirname, '..', '..', '..', '..', '..', '..', 'standards', 'zhongyi-zhineng-bianzheng', 'chapter-map.json');
const UNITS = path.join(__dirname, '..', '..', '..', '..', '..', '..', 'standards', 'zhongyi-zhineng-bianzheng', 'units.json');
const { chapterKeys, chapterUnits, summarize, CHAPTER, SLUG } = require('./main.js');

test('本章映射存在且非空', () => {
  const keys = chapterKeys();
  assert.ok(keys.length > 0, 'chapter-map 里本章没有单元');
});

test('单元都能在单元层找到', () => {
  const units = chapterUnits();
  assert.strictEqual(units.length, chapterKeys().length);
  for (const u of units) assert.ok(u.sub && u.hanzi > 0);
});

test('规模与单元层一致', () => {
  const units = chapterUnits();
  const s = summarize(units);
  assert.strictEqual(s.hanzi, units.reduce((a, b) => a + b.hanzi, 0));
  assert.ok(s.hanzi > 1000, `汉字过少：${s.hanzi}`);
});

test('三辨与四位面都取自单元层，不写死', () => {
  const all = JSON.parse(fs.readFileSync(UNITS, 'utf8'));
  const s = summarize(chapterUnits());
  assert.deepStrictEqual(Object.keys(s.views).sort(), Object.keys(all.views).sort());
  assert.deepStrictEqual(Object.keys(s.levels).sort(), Object.keys(all.levels).sort());
});

test('主导一辨与主导位面可复算', () => {
  const s = summarize(chapterUnits());
  for (const [k, v] of Object.entries(s.views)) assert.ok(v <= s.viewTop[1], `${k} 超过主导项`);
  for (const [k, v] of Object.entries(s.levels)) assert.ok(v <= s.levelTop[1], `${k} 超过主导位面`);
});

test('脚本可运行且输出含教学样例与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 80, '输出过短');
  assert.match(out, /教学样例：数字由 standards\/zhongyi-zhineng-bianzheng\/units\.json 现算/);
  assert.match(out, /不构成临床判断依据/);
});

test('章节号与章映射一致', () => {
  const cm = JSON.parse(fs.readFileSync(MAP, 'utf8')).chapters;
  assert.strictEqual(String(cm[SLUG].n), String(CHAPTER));
});

test('代码头部指向本章目录', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('/chapters/10-shiyong-baogao/docs/zh.md'), '头部注释未指向本章');
});

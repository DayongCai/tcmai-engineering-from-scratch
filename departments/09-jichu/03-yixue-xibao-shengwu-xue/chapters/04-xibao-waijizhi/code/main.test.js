'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { readDoc, molecules, pickFor, basementMembrane, mechanoSteps, mmpControl, dimensionality } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文是本章那一份', () => {
  const doc = readDoc();
  assert.ok(doc.includes('细胞外基质') && doc.includes('基底膜'));
  assert.ok((doc.match(/[\u4e00-\u9fff]/g) || []).length > 2000);
});

test('四类大分子解析正确，力学一列各不相同', () => {
  const ms = molecules(readDoc());
  assert.strictEqual(ms.length, 4);
  const kinds = ms.map((m) => m.kind).join(' ');
  assert.match(kinds, /胶原/);
  assert.match(kinds, /弹性纤维/);
  assert.match(kinds, /蛋白聚糖/);
  assert.match(kinds, /黏附糖蛋白/);
  const mechanics = new Set(ms.map((m) => m.mechanics));
  assert.strictEqual(mechanics.size, 4, '力学任务应互不重复');
});

test('按需求反查：拉不断找胶原、回弹找弹性纤维、抗压找蛋白聚糖', () => {
  const doc = readDoc();
  assert.match(pickFor('拉不断', doc).kind, /胶原/);
  assert.match(pickFor('拉长后复位', doc).kind, /弹性纤维/);
  assert.match(pickFor('撑住水', doc).kind, /蛋白聚糖/);
  assert.match(pickFor('连接与定位', doc).kind, /黏附糖蛋白/);
  assert.throws(() => pickFor('导电', doc));
});

test('基底膜四件套齐，各自分工非空', () => {
  const bm = basementMembrane(readDoc());
  assert.strictEqual(bm.length, 4);
  for (const p of bm) assert.ok(p.role.length >= 4, `分工缺失: ${p.name}`);
});

test('力学信号四步，末步是转录输出', () => {
  const steps = mechanoSteps(readDoc());
  assert.strictEqual(steps.length, 4);
  assert.match(steps[0].title, /整合素聚集/);
  assert.match(steps[1].title, /骨架承力/);
  assert.match(steps[2].title, /信号转导入核/);
  assert.match(steps[3].title, /转录输出/);
});

test('降解三级控制且局部限时', () => {
  const m = mmpControl(readDoc());
  assert.deepStrictEqual(m.stages, ['前体', '激活', '抑制']);
  assert.strictEqual(m.localized, true);
});

test('二维与三维的差别在正文里有断言', () => {
  const d = dimensionality(readDoc());
  assert.strictEqual(d.flat, true);
  assert.strictEqual(d.threeD, true);
  assert.strictEqual(d.drugMustRecheck, true);
});

test('脚本可跑，输出含反查结果与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /拉长后复位 → 弹性纤维/);
  assert.match(out, /现抓/);
  assert.match(out, /不构成临床判断依据/);
});

test('代码头部指向本章正文', () => {
  assert.ok(fs.readFileSync(MAIN, 'utf8').includes('/04-xibao-waijizhi/docs/zh.md'));
});

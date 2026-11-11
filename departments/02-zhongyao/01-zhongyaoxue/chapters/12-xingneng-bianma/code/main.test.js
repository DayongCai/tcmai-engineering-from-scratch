'use strict';
/**
 * 第 12 章单测（8 项）
 *   1. 药库 287 味、向量 21 维
 *   2. 四气分布与 drugs.json 复算一致
 *   3. 性味归经覆盖 287 / 285 / 284（缺项只来自教材没写）
 *   4. 四气轴有序：大寒 < 寒 < 微寒=凉 < 平 < 微温 < 温 < 热 < 大热，且覆盖 9 个取值
 *   5. 向量结构：第 0 维是四气轴值，其余 20 维是 0/1
 *   6. 余弦：自反 = 1、对称
 *   7. 邻居：不含自己、按分数降序、返回 5 条
 *   8. 运行时最后一行是教学边界声明
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { vec, cos, neighbors, shape, QI_AXIS, WEI_DIMS, JING_DIMS } = require('./main.js');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const DRUGS = path.join(ROOT, 'standards', 'zhongyao', 'drugs.json');
const drugs = () => JSON.parse(fs.readFileSync(DRUGS, 'utf8'));

test('1. 药库 287 味、向量 21 维', () => {
  const s = shape();
  assert.strictEqual(s.drugs, 287);
  assert.strictEqual(s.dims, 1 + WEI_DIMS.length + JING_DIMS.length);
  assert.strictEqual(s.dims, 21);
});

test('2. 四气分布复算', () => {
  const s = shape();
  const t = {};
  for (const x of drugs().drugs) t[x.nature.qi] = (t[x.nature.qi] || 0) + 1;
  assert.deepStrictEqual(s.qi, t);
  assert.strictEqual(t['温'], 77);
  assert.strictEqual(t['寒'], 72);
});

test('3. 性味归经覆盖', () => {
  const s = shape();
  assert.strictEqual(s.withQi, 287);
  assert.strictEqual(s.withWei, 285);
  assert.strictEqual(s.withGui, 284);
});

test('4. 四气轴有序且覆盖 9 个取值', () => {
  const keys = Object.keys(QI_AXIS);
  assert.strictEqual(keys.length, 9);
  const sorted = keys.slice().sort((a, b) => QI_AXIS[a] - QI_AXIS[b]);
  for (let i = 1; i < sorted.length; i += 1) {
    assert.ok(QI_AXIS[sorted[i - 1]] <= QI_AXIS[sorted[i]], `${sorted[i - 1]} 应不高于 ${sorted[i]}`);
  }
  assert.strictEqual(sorted[0], '大寒');
  assert.strictEqual(sorted[sorted.length - 1], '大热');
  assert.ok(QI_AXIS['大寒'] < QI_AXIS['寒'] && QI_AXIS['寒'] < QI_AXIS['平']);
  assert.ok(QI_AXIS['平'] < QI_AXIS['温'] && QI_AXIS['温'] < QI_AXIS['大热']);
  assert.strictEqual(QI_AXIS['寒'], -QI_AXIS['温'] * 1);
  // 全部 287 味的四气都有轴值（没有落在 undefined 上）
  for (const x of drugs().drugs) assert.strictEqual(typeof QI_AXIS[x.nature.qi], 'number', `${x.name} 的四气无轴值`);
});

test('5. 向量结构：首维轴值、其余 0/1', () => {
  for (const x of drugs().drugs.slice(0, 40)) {
    const v = vec(x);
    assert.strictEqual(v.length, 21);
    assert.strictEqual(v[0], QI_AXIS[x.nature.qi]);
    for (let i = 1; i < v.length; i += 1) assert.ok(v[i] === 0 || v[i] === 1, `${x.name} 第 ${i} 维不是 0/1`);
  }
});

test('6. 余弦自反与对称', () => {
  const a = drugs().drugs[0];
  const b = drugs().drugs[10];
  assert.ok(Math.abs(cos(vec(a), vec(a)) - 1) < 1e-12, '余弦自反应约等于 1');
  assert.strictEqual(cos(vec(a), vec(b)), cos(vec(b), vec(a)));
});

test('7. 邻居：不含自己、降序、5 条', () => {
  for (const name of ['麻黄', '石膏', '人参']) {
    const nb = neighbors(name);
    assert.strictEqual(nb.length, 5);
    assert.ok(!nb.some((x) => x.name === name), `${name} 的邻居含自己`);
    for (let i = 1; i < nb.length; i += 1) assert.ok(nb[i - 1].score >= nb[i].score, '邻居未按分数降序');
  }
  assert.deepStrictEqual(neighbors('不存在的药'), []);
});

test('8. 运行最后一行是教学边界', () => {
  const run = execFileSync('node', ['code/main.js'], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
  const last = run.trim().split('\n').filter(Boolean).pop();
  assert.ok(/教学边界/.test(last), `最后一行不是教学边界：${last}`);
  assert.ok(/不构成用药依据/.test(last), '缺「不构成用药依据」');
});

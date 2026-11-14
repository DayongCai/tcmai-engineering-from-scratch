#!/usr/bin/env node
/**
 * 第 6 章 火证门（M06）单元测试：断言全部从底本现算，不写死数字。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const lib = require('./main.js');

const data = lib.load();
const s = lib.stats(data);

test('本门存在于结构.json，且门码相符', () => {
  assert.strictEqual(s.men.code, lib.MEN);
  assert.ok(s.men.zh.length > 0);
});

test('类 / 证 / 候 三个计数与逐条遍历一致', () => {
  const zs = lib.chapters(s.men);
  const hs = lib.hous(s.men);
  assert.strictEqual(zs.length, s.zheng);
  assert.strictEqual(hs.length, s.hou);
  assert.ok(s.lei === s.men.lei.length);
});

test('每个证的候数与其声明候数一致（原书自述 vs 目录实条）', () => {
  const bad = [];
  for (const l of s.men.lei) {
    for (const z of l.zhengList) {
      if (z.houList.length !== z.declareHou) bad.push(z.code + ':' + z.houList.length + '/' + z.declareHou);
    }
  }
  // 原书自述与目录实条的差异允许存在，但必须被 结构.json 的 校对.差异 登记过
  const logged = new Set((data.校对.差异 || []).map((d) => d.code));
  const unlogged = bad.filter((b) => !logged.has(b.split(':')[0]));
  assert.deepStrictEqual(unlogged, []);
});

test('每个候都有位与态（拆分无残留）', () => {
  const holes = lib.hous(s.men).filter((h) => !h.wei || !h.tai);
  assert.deepStrictEqual(holes.map((h) => h.code), []);
});

test('候码以本门码为前缀，四级编码可拼接', () => {
  for (const h of lib.hous(s.men)) {
    assert.ok(h.full.startsWith(lib.MEN + '-'), h.full + ' 的前缀不是 ' + lib.MEN);
    assert.strictEqual(h.full, h.zheng + '-' + h.code.split('-').pop());
  }
});

test('本门候数不超过全书候数，比例为 0..1', () => {
  assert.ok(s.hou <= s.allHou);
  assert.ok(s.share > 0 && s.share <= 1);
});

test('tally 按计数降序返回', () => {
  const t = lib.tally(lib.hous(s.men), 'tai');
  for (let i = 1; i < t.length; i += 1) assert.ok(t[i - 1][1] >= t[i][1]);
});

#!/usr/bin/env node
/**
 * 第 3 章 解表剂 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言的重点不是「方名齐不齐」，而是「分野能不能被否证」：
 * 若麻黄只出现在辛温节，则「寒温由单味药决定」这条错误命题就不会被驳倒。
 * 测试要守住那个让它被驳倒的事实。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  jiebiao,
  chapterHanzi,
  bySection,
  herbSections,
  crossSectionHerbs,
  universalHerbs,
  herbStats,
  load,
} = require('./main');

const fj = load();
const list = jiebiao(fj);

test('第5章 8 首方，全部归属汗法', () => {
  assert.strictEqual(list.length, 8);
  assert.ok(list.every((f) => f.fa === '汗'), '有方未归汗法');
  assert.strictEqual(new Set(list.map((f) => f.name)).size, 8, '方名重复');
});

test('三节分野：辛温 4 / 辛凉 3 / 扶正 1', () => {
  const g = bySection(list);
  assert.deepStrictEqual([...g.keys()], ['5.1 辛温解表剂', '5.2 辛凉解表剂', '5.3 扶正解表剂']);
  assert.deepStrictEqual([...g.values()].map((a) => a.length), [4, 3, 1]);
});

test('药位 58、药名 37 —— 58 与 37 的差要能说清', () => {
  const { slots, names } = herbStats(list);
  assert.strictEqual(slots, 58);
  assert.strictEqual(names, 37);
  // 37 个「名字」里有 1 个不是药名（九味羌活汤组成里的「故以为名」是抽取瑕疵）
  const bad = new Set();
  for (const f of list) for (const h of f.composition.herbs) if (!/^[\u4e00-\u9fa5]{2,4}$/.test(h.name) || h.name === '故以为名') bad.add(h.name);
  assert.deepStrictEqual([...bad], ['故以为名'], '抽取瑕疵已被静默修掉——请同步更新文档中的 37/36 口径');
});

test('麻黄 3 首跨辛温与辛凉：寒温不由单味药定', () => {
  const ma = list.filter((f) => f.composition.herbs.some((h) => h.name === '麻黄'));
  assert.strictEqual(ma.length, 3);
  const secs = new Set(ma.map((f) => f.sec.slice(0, 3)));
  assert.deepStrictEqual([...secs].sort(), ['5.1', '5.2']);
  assert.ok(ma.some((f) => f.name === '麻杏石甘汤'), '麻杏石甘汤应含麻黄');
});

test('甘草 8/8 全方共有，是常数而非分野', () => {
  assert.deepStrictEqual(universalHerbs(list), ['甘草']);
  for (const f of list) {
    assert.ok(f.composition.herbs.some((h) => h.name === '甘草'), `${f.name} 缺甘草`);
  }
});

test('跨节药 6 味，且都在两节以上出现', () => {
  const cross = crossSectionHerbs(list);
  assert.strictEqual(cross.length, 6);
  assert.deepStrictEqual(cross.map((c) => c.herb).sort(), ['川芎', '杏仁', '桔梗', '甘草', '羌活', '麻黄']);
  for (const c of cross) assert.ok(c.secs.length >= 2);
  // 甘草是唯一横跨三节的药
  assert.deepStrictEqual(cross.find((c) => c.herb === '甘草').secs, ['5.1', '5.2', '5.3']);
});

test('分类看节、不看措辞：5.2 中功用写「辛凉」的只有 2 首', () => {
  const xl = bySection(list).get('5.2 辛凉解表剂');
  const withWord = xl.filter((f) => /辛凉/.test(f.gongyong)).map((f) => f.name);
  assert.deepStrictEqual(withWord.sort(), ['麻杏石甘汤', '银翘散'].sort());
  assert.ok(xl.some((f) => f.name === '桑菊饮'), '桑菊饮仍归辛凉节，尽管功用措辞不含辛凉');
});

test('八首方都有君药；桂枝汤的芍药同记臣与佐', () => {
  for (const f of list) assert.ok((f.roles['君'] || []).length > 0, `${f.name} 未抽到君药`);
  const gz = list.find((f) => f.name === '桂枝汤');
  assert.deepStrictEqual(gz.roles['臣'], ['芍药']);
  assert.deepStrictEqual(gz.roles['佐'], ['芍药']);
});

test('本章教材字数与底本一致：第5章 16563 字', () => {
  assert.strictEqual(chapterHanzi(5), 16563);
});

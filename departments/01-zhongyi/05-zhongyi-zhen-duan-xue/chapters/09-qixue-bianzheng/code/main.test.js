'use strict';

/**
 * 第 9 章 单测：教材第 7 章（病性辨证）的字数账与证候名逐字核对
 *   node --test code/main.test.js
 */

const assert = require('node:assert');
const test = require('node:test');
const {
  bookShape, sectionTable, weights, liuyin, yili, qiqing, qixue, jinye, gaps,
  chapter, corpus,
} = require('./main.js');

test('教材本体：14 章 / 46 节 / 105 小节 / 196 段 / 22,215 字，sha256 051d830a…', () => {
  const b = bookShape();
  assert.strictEqual(b.chapters, 14);
  assert.strictEqual(b.secs, 46);
  assert.strictEqual(b.subs, 105);
  assert.strictEqual(b.paras, 196);
  assert.strictEqual(b.chars, 22215);
  assert.ok(b.sha256.startsWith('051d830a'));
});

test('第7章 病性辨证：声明 1,945 字 = 逐段重算 1,945 字（不重不漏）', () => {
  const b = bookShape();
  assert.strictEqual(b.here.no, '7');
  assert.strictEqual(b.here.title, '病性辨证');
  assert.strictEqual(b.here.secs, 5);
  assert.strictEqual(b.here.paras, 19);
  assert.strictEqual(b.here.chars, 1945);
  assert.strictEqual(chapter('7').counts.chars, 1945);
  assert.ok(Math.abs(b.share - 1945 / 22215) < 1e-12);
});

test('五节字数：413 / 175 / 163 / 770 / 424，合计 1,945', () => {
  const rows = sectionTable();
  assert.deepStrictEqual(rows.map((r) => r.no), ['7.1', '7.2', '7.3', '7.4', '7.5']);
  assert.deepStrictEqual(rows.map((r) => r.chars), [413, 175, 163, 770, 424]);
  assert.strictEqual(rows.reduce((n, r) => n + r.chars, 0), 1945);
  assert.deepStrictEqual(rows.map((r) => +r.share.toFixed(4)),
    [0.2123, 0.09, 0.0838, 0.3959, 0.218]);
});

test('权重：气血 770 字 = 39.6%、七情 175 字 = 9.0%、气血是七情的 4.40 倍', () => {
  const w = weights();
  assert.strictEqual(w.total, 1945);
  assert.ok(Math.abs(w.qixue.share - 770 / 1945) < 1e-12);
  assert.ok(Math.abs(w.qixue.share - 0.396) < 5e-4);
  assert.ok(Math.abs(w.qiqing.share - 175 / 1945) < 1e-12);
  assert.ok(Math.abs(w.qiqing.share - 0.09) < 5e-4);
  assert.strictEqual(w.ratio, 4.4);
  // 气血 + 津液 = 1,194 字 = 61.4%
  assert.strictEqual(w.qixue.chars + w.jinye.chars, 1194);
  assert.ok(Math.abs(w.qixueJinyeShare - 1194 / 1945) < 1e-12);
  assert.strictEqual(w.perPara, 102.4);
});

test('六淫：3 个条目装 6 个证（风/寒/暑/湿/燥/火），全部逐字命中', () => {
  const l = liuyin();
  assert.deepStrictEqual(l.names, ['风淫', '寒淫', '暑淫', '湿淫', '燥淫', '火淫']);
  assert.strictEqual(l.items, 3);
  assert.strictEqual(l.names.length, 6);
  assert.strictEqual(l.allPresent, true);
  assert.strictEqual(l.packed, true);
});

test('疫疠：1 条 / 96 字，且「疫疠证候」在底本出现', () => {
  const y = yili();
  assert.strictEqual(y.items, 1);
  assert.strictEqual(y.chars, 96);
  assert.strictEqual(y.present, true);
});

test('七情：只有两条（直接伤脏 / 影响气机），175 字，占本章 9.0%', () => {
  const q = qiqing();
  assert.strictEqual(q.chars, 175);
  assert.strictEqual(q.items, 2);
  assert.strictEqual(q.subs, 1);
  assert.strictEqual(q.hasDirectOrgan, true);
  assert.strictEqual(q.hasQiMovement, true);
  assert.ok(Math.abs(q.chars / 1945 - 0.09) < 5e-4);
});

test('气血 14 证 = 单轴 9 + 双轴 5，每个证名都能在底本逐字找到', () => {
  const q = qixue();
  assert.strictEqual(q.chars, 770);
  assert.strictEqual(q.qi.length, 4);
  assert.strictEqual(q.xue.length, 5);
  assert.strictEqual(q.total, 14);
  assert.strictEqual(q.dualCount, 5);
  assert.strictEqual(q.allPresent, true);
  // 5 个同病证的名字里同时含「气」「血」——交叉表写在名字上
  assert.strictEqual(q.dualBothChars, 5);
  assert.deepStrictEqual(q.dual.map((x) => x.name), ['气滞血瘀', '气虚血瘀', '气血两虚', '气不摄血', '气随血脱']);
});

test('津液 8 个节点：津亏 / 液脱 / 痰 / 饮四类 / 水停', () => {
  const j = jinye();
  assert.strictEqual(j.chars, 424);
  assert.strictEqual(j.total, 8);
  assert.strictEqual(j.yin, 4);
  assert.strictEqual(j.allPresent, true);
  assert.deepStrictEqual(j.rows.map((x) => x.name), ['津亏', '液脱', '痰', '痰饮', '悬饮', '溢饮', '支饮', '水停']);
});

test('缺口：7.4 血瘀段停在「、」，7.2/7.3 不足 200 字——如实报，不代补', () => {
  const g = gaps();
  assert.strictEqual(g.dangling.length, 1);
  assert.strictEqual(g.dangling[0].no, '7.4');
  assert.ok(g.dangling[0].tail.endsWith('、'));
  assert.deepStrictEqual(g.thinSections, ['7.2', '7.3']);
  // 断句之后没有 ⑥，说明底本这一段确实缺尾
  assert.ok(!corpus().includes('⑥'));
});

#!/usr/bin/env node
/**
 * 第 1 章 绪论 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、三视角重心、三类关系的落位、数值是否为 0、
 * 以及 docs 正文有没有偷偷写「数字＋计量单位」。
 * 不锁死正文措辞，教材改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const {
  CHAPTER,
  ANCHOR,
  FRAME,
  BOUNDARY,
  locatorOf,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  valueAudit,
  anchorCoverage,
  bySection,
  checkSubFormat,
} = require('./main');

const list = chapterUnits();
const doc = fs.readFileSync(path.join(__dirname, '..', 'docs', 'zh.md'), 'utf8');

test('本章 3 个知识单元、1 节，教材正文 5463 个非空白字符（汉字 4993）', () => {
  const s = shape(list);
  assert.strictEqual(CHAPTER, 1);
  assert.strictEqual(s.units, 3);
  assert.strictEqual(s.secs, 1);
  assert.strictEqual(s.chars, 5463);
  assert.strictEqual(s.hanzi, 4993);
  assert.deepStrictEqual(list.map((u) => u.sub), ['1.1.1', '1.1.2', '1.1.3']);
});

test('小节号全部合 1.M.K 格式，且每单元出处都是「教材·疾病学基础·第1章·N.M.K」', () => {
  const fmt = checkSubFormat(list);
  assert.strictEqual(fmt.ok, true, `非法小节号：${fmt.bad.join('、')}`);
  for (const u of list) {
    assert.match(u.locator, /^教材·疾病学基础·第1章·1\.\d\.\d$/, `${u.sub} 出处不对`);
    assert.strictEqual(u.locator, locatorOf(u.sub));
  }
  // 出处里的章号必须等于小节号首段，不许写成课程章号另起一号
  for (const u of list) assert.strictEqual(u.locator.split('第')[1].split('章')[0], u.sub.split('.')[0]);
});

test('三视角合计 64 次，以机制为重心（概念章给框架，不给过程细节）', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 64);
  assert.strictEqual(views.机制, 34);
  assert.strictEqual(views.机能, 20);
  assert.strictEqual(views.病因, 10);
  assert.strictEqual(rank(views)[0][0], '机制');
});

test('四层级合计 20 次，落在系统层（绪论谈的是状态与关系，不谈细胞形态）', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 20);
  assert.strictEqual(levels.系统, 13);
  assert.strictEqual(levels.组织, 4);
  assert.strictEqual(levels.器官, 2);
  assert.strictEqual(levels.细胞, 1);
  assert.strictEqual(rank(levels)[0][0], '系统');
});

test('数值核验：3 个单元的 valueLike 全为 0，没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 3);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('三类关系（前置 / 并列 / 分工）只在 1.1.3 齐备，六要素只在 1.1.1 落位', () => {
  assert.deepStrictEqual(ANCHOR, ['前置', '并列', '分工']);
  assert.deepStrictEqual(anchorCoverage(list), ['1.1.3']);
  assert.deepStrictEqual(anchorCoverage(list, FRAME), ['1.1.1']);
  // 抽掉一个词，命中数只可能变多或不变——三词同时命中是最严的口径
  const loose = anchorCoverage(list, ['分工']);
  assert.ok(loose.length >= 1);
});

test('三节内容不摊成九节：本章只有 1.1 一节，三单元字数相差不到一个单元', () => {
  const secs = bySection(list);
  assert.strictEqual(secs.size, 1);
  const g = secs.get('1.1 健康与疾病的概念类别');
  assert.ok(g, '节名应为「1.1 健康与疾病的概念类别」');
  assert.strictEqual(g.units, 3);
  const hz = list.map((u) => u.hanzi);
  assert.ok(Math.max(...hz) - Math.min(...hz) < 60, `三单元字数：${hz.join('、')}`);
});

test('docs 正文没有裸写的「数字＋计量单位」（教材引文行除外）', () => {
  const VALUE_RE = /\d+(?:\.\d+)?\s*(?:mmHg|kPa|℃|°C|‰|%|mmol|mOsm|mol|mV|Hz|次\/分|个\/L|g\/L|mg\/ml|mg|ml|mL|kg|cm|mm|μm|um|ms|min|小时|秒钟|升|毫升|倍|周|天|年)/g;
  const LOCATOR = /教材·疾病学基础·第\d+章/;
  const bad = [];
  for (const line of doc.split('\n')) {
    if (LOCATOR.test(line)) continue;
    const m = line.match(VALUE_RE);
    if (m) bad.push(...m);
  }
  assert.deepStrictEqual(bad, [], `docs 出现裸数值：${bad.join('、')}`);
});

test('docs 写明本章教材字数 5463，并含教学边界句与 3 个单元号', () => {
  assert.ok(doc.replace(/,/g, '').includes('5463'), 'docs 没写本章教材字数');
  assert.ok(doc.includes(BOUNDARY), 'docs 缺教学边界句');
  for (const k of ['MOTTO', 'PROBLEM', '环境逼迫', '知识积累', '代价与边界', '运行与验证', '免责']) {
    assert.ok(doc.includes(k), `docs 缺 ${k}`);
  }
  for (const u of list) assert.ok(doc.includes(u.sub), `docs 没点明 ${u.sub}`);
  assert.ok(/不写数值/.test(doc), 'docs 缺「不写数值」声明');
  assert.ok(/不作诊断/.test(doc), 'docs 缺「不作诊断」声明');
  assert.ok(!doc.includes('%'), 'docs 出现百分号（本书不给百分比数值）');
  assert.match(BOUNDARY, /教学边界/);
  assert.match(BOUNDARY, /不构成/);
});

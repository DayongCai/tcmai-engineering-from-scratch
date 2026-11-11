#!/usr/bin/env node
/**
 * 第 2 章 疾病概论 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、三视角重心、三组规律的落位、数值是否为 0、
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
  primaryViews,
  checkSubFormat,
} = require('./main');

const list = chapterUnits();
const doc = fs.readFileSync(path.join(__dirname, '..', 'docs', 'zh.md'), 'utf8');

test('本章 9 个知识单元、3 节，教材正文 16292 个非空白字符（汉字 15005）', () => {
  const s = shape(list);
  assert.strictEqual(CHAPTER, 2);
  assert.strictEqual(s.units, 9);
  assert.strictEqual(s.secs, 3);
  assert.strictEqual(s.chars, 16292);
  assert.strictEqual(s.hanzi, 15005);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '1.2.1', '1.2.2', '1.2.3',
    '1.3.1', '1.3.2', '1.3.3',
    '1.4.1', '1.4.2', '1.4.3',
  ]);
});

test('小节号全部合 1.M.K 格式（底本章号，不是课程章号），出处章号 = 小节号首段', () => {
  const fmt = checkSubFormat(list);
  assert.strictEqual(fmt.ok, true, `非法小节号：${fmt.bad.join('、')}`);
  for (const u of list) {
    assert.match(u.locator, /^教材·疾病学基础·第1章·1\.\d\.\d$/, `${u.sub} 出处不对`);
    assert.strictEqual(u.locator, locatorOf(u.sub));
    assert.strictEqual(u.locator.split('第')[1].split('章')[0], u.sub.split('.')[0]);
    // 课程第 2 章 = 底本第 1 章：写成「第2章·1.2.1」就是编引用
    assert.notStrictEqual(u.locator.split('第')[1].split('章')[0], String(CHAPTER));
  }
});

test('三视角合计 309 次：名为「病因」的章，重心在机制（病因只占一小截）', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 309);
  assert.strictEqual(views.机制, 175);
  assert.strictEqual(views.机能, 85);
  assert.strictEqual(views.病因, 49);
  assert.strictEqual(rank(views)[0][0], '机制');
  assert.ok(views.机制 > views.病因 * 3, '机制应是病因的三倍以上');
});

test('四层级合计 70 次，落在系统层（讲的是过程与状态，不是细胞形态）', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 70);
  assert.strictEqual(levels.系统, 63);
  assert.strictEqual(levels.组织, 5);
  assert.strictEqual(levels.器官, 1);
  assert.strictEqual(levels.细胞, 1);
  assert.strictEqual(rank(levels)[0][0], '系统');
});

test('数值核验：9 个单元的 valueLike 全为 0，没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 9);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('三类环节只在 1.3.2 与 1.3.3 齐备；转归两类只在 1.4.1 与 1.4.2 并写', () => {
  assert.deepStrictEqual(ANCHOR, ['起始', '中间', '末端']);
  assert.deepStrictEqual(anchorCoverage(list), ['1.3.2', '1.3.3']);
  assert.deepStrictEqual(anchorCoverage(list, FRAME), ['1.4.1', '1.4.2']);
  const loose = anchorCoverage(list, ['起始']);
  assert.ok(loose.length >= 2, '抽掉一个词，命中数只可能变多');
});

test('三节各 3 单元、字数几乎持平：教材按话题均分，不按重要性分层', () => {
  const secs = bySection(list);
  assert.strictEqual(secs.size, 3);
  const order = [...secs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'));
  assert.deepStrictEqual(order.map(([sec]) => sec.split(' ')[0]), ['1.2', '1.3', '1.4']);
  for (const [sec, g] of order) {
    assert.strictEqual(g.units, 3, `${sec} 单元数`);
    assert.ok(g.hanzi > 4900 && g.hanzi < 5100, `${sec} 汉字 ${g.hanzi}`);
  }
});

test('九单元的主视角分布：机制 5 / 机能 2 / 病因 2', () => {
  const prim = primaryViews(list);
  assert.deepStrictEqual(prim.机制, ['1.2.1', '1.3.2', '1.3.3', '1.4.1', '1.4.2']);
  assert.deepStrictEqual(prim.机能, ['1.2.2', '1.3.1']);
  assert.deepStrictEqual(prim.病因, ['1.2.3', '1.4.3']);
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

test('docs 写明本章教材字数 16292，并含教学边界句与 9 个单元号', () => {
  assert.ok(doc.replace(/,/g, '').includes('16292'), 'docs 没写本章教材字数');
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

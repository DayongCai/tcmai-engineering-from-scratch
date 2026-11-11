#!/usr/bin/env node
/**
 * 第 5 章 炎症 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、词频重心、三要素覆盖、数值是否为 0、
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
  BOUNDARY,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  anchorCoverage,
  bySection,
  pointsUnits,
  checkSubFormat,
} = require('./main');

const units = load();
const list = chapterUnits(units);
const doc = fs.readFileSync(path.join(__dirname, '..', 'docs', 'zh.md'), 'utf8');

test('本章 12 个知识单元，分属 4 节，正文合计 20593 字', () => {
  const s = shape(list);
  assert.strictEqual(CHAPTER, '5');
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 20593);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '5.1.1', '5.1.2', '5.1.3',
    '5.2.1', '5.2.2', '5.2.3',
    '5.3.1', '5.3.2', '5.3.3',
    '5.4.1', '5.4.2', '5.4.3',
  ]);
});

test('小节号全部合 5.M.K 格式，且每单元都带「教材·第5章·N.M.K」出处', () => {
  const fmt = checkSubFormat(list);
  assert.strictEqual(fmt.ok, true, `非法小节号：${fmt.bad.join('、')}`);
  for (const u of list) assert.match(u.locator, /^教材·第5章·5\.\d\.\d$/, `${u.sub} 出处不对`);
});

test('三视角合计 748 次，以形态为重心（八成以上）', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 748);
  assert.strictEqual(views.形态, 611);
  assert.strictEqual(views.机制, 126);
  assert.strictEqual(views.病因, 11);
  assert.strictEqual(rank(views)[0][0], '形态');
  assert.ok(share(views, '形态') > 0.8 && share(views, '形态') < 0.83);
});

test('四层级合计 417 次，落在细胞层（三要素的描述以细胞与间质为单位）', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 417);
  assert.strictEqual(levels.细胞, 159);
  assert.strictEqual(levels.组织, 150);
  assert.strictEqual(levels.系统, 49);
  assert.strictEqual(rank(levels)[0][0], '细胞');
});

test('数值核验：12 个单元的 valueLike 全为 0，没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 12);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('三要素齐备的单元为 8 个：类型划分的依据是配比，不是有无', () => {
  assert.deepStrictEqual(ANCHOR, ['变质', '渗出', '增生']);
  const hit = anchorCoverage(list);
  assert.strictEqual(hit.length, 8);
  assert.deepStrictEqual(hit, ['5.1.1', '5.2.1', '5.2.2', '5.2.3', '5.3.1', '5.3.2', '5.3.3', '5.4.3']);
  // 抽掉任何一个词，命中数只可能变多或不变——三词同时命中是最严的口径
  const loose = anchorCoverage(list, ['渗出']);
  assert.ok(loose.length >= hit.length);
});

test('四节各 3 个单元，每节汉字数都在 5000 以上（教材按节均分）', () => {
  const secs = bySection(list);
  assert.strictEqual(secs.size, 4);
  for (const [sec, g] of secs) {
    assert.strictEqual(g.units, 3, `${sec} 单元数`);
    assert.ok(g.hanzi > 5000, `${sec} 只有 ${g.hanzi} 字`);
  }
  assert.strictEqual(pointsUnits(list).length, 4);
});

test('docs 正文没有裸写的「数字＋计量单位」（教材引文行除外）', () => {
  const VALUE_RE = /\d+(?:\.\d+)?\s*(?:mmHg|kPa|℃|°C|‰|%|mmol|mOsm|mol|mV|Hz|次\/分|个\/L|g\/L|mg\/ml|mg|ml|mL|kg|cm|mm|μm|um|ms|min|小时|秒钟|升|毫升|倍|周|天|年)/g;
  const LOCATOR = /教材·第\d+章/;
  const bad = [];
  for (const line of doc.split('\n')) {
    if (LOCATOR.test(line)) continue;
    const m = line.match(VALUE_RE);
    if (m) bad.push(...m);
  }
  assert.deepStrictEqual(bad, [], `docs 出现裸数值：${bad.join('、')}`);
});

test('docs 写明本章教材字数 20593，并含教学边界句与 12 个单元号', () => {
  assert.ok(doc.replace(/,/g, '').includes('20593'), 'docs 没写本章教材字数');
  assert.ok(doc.includes(BOUNDARY), 'docs 缺教学边界句');
  for (const k of ['MOTTO', 'PROBLEM', '环境逼迫', '知识积累', '代价与边界', '运行与验证', '免责']) {
    assert.ok(doc.includes(k), `docs 缺 ${k}`);
  }
  for (const u of list) assert.ok(doc.includes(u.sub), `docs 没点明 ${u.sub}`);
  assert.ok(!/%/.test(doc), 'docs 出现百分号');
  assert.match(BOUNDARY, /教学边界/);
  assert.match(BOUNDARY, /不构成/);
});

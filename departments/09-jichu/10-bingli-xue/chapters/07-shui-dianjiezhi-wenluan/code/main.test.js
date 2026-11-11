#!/usr/bin/env node
/**
 * 第 7 章 水、电解质代谢紊乱 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、词频重心、容量与渗透压的覆盖、数值是否为 0、
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

test('本章 12 个知识单元，分属 4 节，正文合计 20215 字', () => {
  const s = shape(list);
  assert.strictEqual(CHAPTER, '7');
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 20215);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '7.1.1', '7.1.2', '7.1.3',
    '7.2.1', '7.2.2', '7.2.3',
    '7.3.1', '7.3.2', '7.3.3',
    '7.4.1', '7.4.2', '7.4.3',
  ]);
});

test('小节号全部合 7.M.K 格式，且每单元都带「教材·第7章·N.M.K」出处', () => {
  const fmt = checkSubFormat(list);
  assert.strictEqual(fmt.ok, true, `非法小节号：${fmt.bad.join('、')}`);
  for (const u of list) assert.match(u.locator, /^教材·第7章·7\.\d\.\d$/, `${u.sub} 出处不对`);
});

test('三视角合计 280 次，以机制为重心，且病因命中为零', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 280);
  assert.strictEqual(views.机制, 150);
  assert.strictEqual(views.形态, 130);
  assert.strictEqual(views.病因, 0);
  assert.strictEqual(rank(views)[0][0], '机制');
  assert.ok(share(views, '机制') > 0.5);
});

test('四层级合计 207 次，落在细胞层（渗透压与跨膜移动以细胞为单位讲）', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 207);
  assert.strictEqual(levels.细胞, 104);
  assert.strictEqual(levels.系统, 54);
  assert.strictEqual(levels.组织, 16);
  assert.strictEqual(rank(levels)[0][0], '细胞');
  // 组织层是四层里最低的一层：本章不谈「组织长什么样」
  assert.strictEqual(rank(levels)[3][0], '组织');
});

test('数值核验：12 个单元的 valueLike 全为 0，没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 12);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('容量与渗透压同时写到的单元为 8 个：分类是两把尺的组合', () => {
  assert.deepStrictEqual(ANCHOR, ['容量', '渗透压']);
  const hit = anchorCoverage(list);
  assert.strictEqual(hit.length, 8);
  assert.deepStrictEqual(hit, ['7.1.1', '7.1.2', '7.1.3', '7.2.1', '7.2.2', '7.2.3', '7.4.1', '7.4.3']);
  // 只查一个词，命中数只可能变多或不变——双词同时命中是最严的口径
  const loose = anchorCoverage(list, ['容量']);
  assert.ok(loose.length >= hit.length);
});

test('四节各 3 个单元，每节汉字数都在 4900 以上（第四节与前三节同量级）', () => {
  const secs = bySection(list);
  assert.strictEqual(secs.size, 4);
  for (const [sec, g] of secs) {
    assert.strictEqual(g.units, 3, `${sec} 单元数`);
    assert.ok(g.hanzi > 4900, `${sec} 只有 ${g.hanzi} 字`);
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

test('docs 写明本章教材字数 20215，并含教学边界句与 12 个单元号', () => {
  assert.ok(doc.replace(/,/g, '').includes('20215'), 'docs 没写本章教材字数');
  assert.ok(doc.includes(BOUNDARY), 'docs 缺教学边界句');
  for (const k of ['MOTTO', 'PROBLEM', '环境逼迫', '知识积累', '代价与边界', '运行与验证', '免责']) {
    assert.ok(doc.includes(k), `docs 缺 ${k}`);
  }
  for (const u of list) assert.ok(doc.includes(u.sub), `docs 没点明 ${u.sub}`);
  assert.ok(!/%/.test(doc), 'docs 出现百分号');
  assert.match(BOUNDARY, /教学边界/);
  assert.match(BOUNDARY, /不构成/);
});

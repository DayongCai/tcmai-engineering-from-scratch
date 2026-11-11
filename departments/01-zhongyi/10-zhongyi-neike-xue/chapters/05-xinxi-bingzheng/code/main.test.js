#!/usr/bin/env node
/**
 * 第 5 章 心系病证 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、逐病证字数、证型清点、方剂复用、病机与病位词频、
 * 调护与按语占比、量值是否为 1（且只落在调护节）。不锁正文措辞，
 * 底本改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  KEYWORDS,
  ORGANS,
  load,
  chapter,
  subsOf,
  hanzi,
  bodyOf,
  shape,
  sectionStats,
  syndromeAudit,
  formulaAudit,
  keywordHits,
  keywordCounts,
  organCounts,
  tailShare,
  valueAudit,
  extremes,
} = require('./main');

const base = load();
const chap = chapter(base);
const subs = subsOf(chap);

const SUBS = [
  '5.1.1', '5.1.2', '5.1.3', '5.1.4', '5.1.5',
  '5.2.1', '5.2.2', '5.2.3', '5.2.4', '5.2.5',
  '5.3.1', '5.3.2', '5.3.3', '5.3.4', '5.3.5',
  '5.4.1', '5.4.2', '5.4.3', '5.4.4', '5.4.5',
  '5.5.1', '5.5.2', '5.5.3', '5.5.4', '5.5.5',
  '5.6.1', '5.6.2', '5.6.3', '5.6.4', '5.6.5',
  '5.7.1', '5.7.2', '5.7.3', '5.7.4', '5.7.5',
  '5.8.1', '5.8.2', '5.8.3', '5.8.4', '5.8.5',
  '5.9.1', '5.9.2', '5.9.3', '5.9.4', '5.9.5',
];

test('本章 9 节 45 小节，正文合计 35350 汉字', () => {
  const s = shape(chap);
  assert.strictEqual(s.secs, 9);
  assert.strictEqual(s.subs, 45);
  assert.strictEqual(s.hanzi, 35350);
  assert.deepStrictEqual(subs.map((u) => u.no), SUBS);
  assert.strictEqual(new Set(SUBS).size, 45);
});

test('九病各 5 小节，五段模板一篇不缺（概述·病因病机·辨证论治·预防调护·按语）', () => {
  for (const s of chap.secs) {
    assert.deepStrictEqual(
      s.subs.map((u) => u.title),
      ['概述', '病因病机', '辨证论治', '预防调护', '按语'],
      `${s.no} ${s.title} 的小节次序`,
    );
  }
});

test('逐病证字数：心悸 4490 最厚起手，健忘 3595 最薄', () => {
  const secs = sectionStats(chap);
  assert.deepStrictEqual(secs.map((x) => x.no), ['5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.8', '5.9']);
  assert.deepStrictEqual(secs.map((x) => x.hanzi), [4490, 4388, 3699, 3842, 3595, 3823, 3888, 3779, 3846]);
  assert.deepStrictEqual(secs.map((x) => x.title), ['心悸', '胸痹心痛', '心衰', '不寐', '健忘', '痴呆', '癫狂', '痫病', '厥证']);
});

test('辨证论治占各篇四到五成：九篇无一低于 4 成，心悸与胸痹最高', () => {
  const secs = sectionStats(chap);
  assert.deepStrictEqual(secs.map((x) => x.cheng), [5, 5, 4, 4, 4, 5, 4, 4, 5]);
  for (const x of secs) assert.ok(x.cheng >= 4, `${x.no} 辨证论治占 ${x.cheng} 成`);
  assert.ok(secs[0].bianzheng + secs[1].bianzheng > 4400, '心悸与胸痹的证治合计应过四千四百字');
});

test('证型清点：47 个证型，心悸与胸痹各 7 证居首，心衰 4 证最简', () => {
  const syn = syndromeAudit(chap);
  assert.deepStrictEqual(syn.map((x) => x.sec), ['5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.8', '5.9']);
  assert.deepStrictEqual(syn.map((x) => x.count), [7, 7, 4, 5, 4, 5, 5, 5, 5]);
  assert.strictEqual(syn.reduce((n, x) => n + x.count, 0), 47);
  assert.ok(syn.every((x) => x.count > 0), '九病都应清出证型');
});

test('代表方：47 次、41 首，5 首跨病证复用（归脾汤跨三病）', () => {
  const fx = formulaAudit(chap);
  assert.strictEqual(fx.total, 47);
  assert.strictEqual(fx.distinct, 41);
  assert.strictEqual(fx.reused.length, 5);
  assert.deepStrictEqual(fx.reused.map((r) => r.name).sort(), [
    '血府逐瘀汤', '通窍活血汤', '归脾汤', '导痰汤', '黄连温胆汤',
  ].sort());
  const guipi = fx.reused.find((r) => r.name === '归脾汤');
  assert.deepStrictEqual(guipi.secs.sort(), ['5.1', '5.4', '5.5']);
  // 一证一方：证型数与用方次数相等，无一首通治之方
  assert.strictEqual(fx.total, syndromeAudit(chap).reduce((n, x) => n + x.count, 0));
});

test('病机词频：痰 330 压过虚 318，神 276 居第三——九病八病有痰证', () => {
  const w = keywordCounts(chap);
  assert.deepStrictEqual(KEYWORDS.map((k) => k.key), ['虚', '实', '痰', '瘀', '水', '火', '神']);
  assert.deepStrictEqual(w.map((x) => x.key), ['痰', '虚', '神', '瘀', '实', '火', '水']);
  assert.deepStrictEqual(w.map((x) => x.total), [330, 318, 276, 164, 120, 105, 98]);
  assert.strictEqual(w[0].key, '痰', '本章出现频次最高的病机词应是痰');
});

test('病位词频：心 728 为轴，脾 144 与肾 113 次之，肺 22 最少；45 小节里 44 节提到心', () => {
  const o = organCounts(chap);
  assert.deepStrictEqual(ORGANS, ['心', '肝', '脾', '肺', '肾']);
  assert.deepStrictEqual(o.map((x) => x.total), [728, 75, 144, 22, 113]);
  assert.strictEqual(o[0].organ, '心');
  assert.ok(o[0].total > o[2].total + o[4].total, '心的次数应多于脾肾之和');
  assert.strictEqual(keywordHits(chap, '心').per.length, 44);
  // 唯一不提「心」的小节是痫病按语：教材把痫病归在心系是以神志为类，不以脏为治
  const withoutXin = subs.filter((u) => !bodyOf(u).includes('心')).map((u) => u.no);
  assert.deepStrictEqual(withoutXin, ['5.8.5']);
});

test('调护与按语：4891 + 4926 字，各篇均五百余字，合计占全章 2.8 成', () => {
  const t = tailShare(chap);
  assert.strictEqual(t.care, 4891);
  assert.strictEqual(t.anYu, 4926);
  assert.strictEqual(t.cheng, 2.8);
  assert.ok(t.careAvg >= 500 && t.careAvg <= 600, `预防调护每篇均 ${t.careAvg} 字`);
  assert.ok(t.anYuAvg >= 500 && t.anYuAvg <= 600, `按语每篇均 ${t.anYuAvg} 字`);
});

test('量值核验：45 小节正文命中 1 处，且落在 5.1.4 的生活调护', () => {
  const v = valueAudit(chap);
  assert.strictEqual(v.subs, 45);
  assert.strictEqual(v.hits, 1);
  assert.deepStrictEqual(v.offenders.map((o) => o.sub), ['5.1.4']);
});

test('小节两端：最薄 5.8.2（509 字），最厚 5.1.3（2242 字）——厚在证治，薄在病机', () => {
  assert.deepStrictEqual(extremes(chap), {
    thinnest: { sub: '5.8.2', hanzi: 509 },
    thickest: { sub: '5.1.3', hanzi: 2242 },
  });
  assert.strictEqual(hanzi(bodyOf(subs.find((u) => u.no === '5.1.1'))), 583);
});

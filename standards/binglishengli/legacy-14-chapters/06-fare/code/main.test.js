#!/usr/bin/env node
/**
 * 第 6 章 发热 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：小节数、节分布、字数、三层关系（致热原 / 环节 / 分期）、
 * 调定点覆盖、边界句覆盖、数值是否为 0。不锁死正文措辞。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  ROOT,
  PYROGENS,
  LINKS,
  STAGES,
  BOUNDARY,
  load,
  loadBase,
  chapterSubs,
  chapterUnits,
  shape,
  lens,
  rank,
  valueAudit,
  cover,
  bySection,
} = require('./main');

const M = require(require('node:path').join(ROOT, 'scripts', 'lib_binglishengli_map.js'));
const units = load();
const list = chapterUnits(units);

test('本章 6 个小节，分属 2 节，正文合计 10849 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 6);
  assert.strictEqual(s.secs, 2);
  assert.strictEqual(s.chars, 10849);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '6.3.1', '6.3.2', '6.3.3', '6.4.1', '6.4.2', '6.4.3',
  ]);
});

test('小节号与标题都从映射现取，标题不带重复编号', () => {
  const truth = M.subsOf(loadBase(), 6);
  assert.deepStrictEqual(chapterSubs(), truth.map((u) => u.sub));
  assert.deepStrictEqual(list.map((u) => u.title), truth.map((u) => u.title));
  for (const u of list) assert.ok(!/^\d+\.\d+\.\d+\s/.test(u.title), `${u.sub} 标题仍带编号：${u.title}`);
});

test('三视角以机制为主轴，病因视角为 0（本章讲机制环节，不按病因归类）', () => {
  const { views } = lens(list);
  assert.strictEqual(views.机制, 135);
  assert.strictEqual(views.机能, 70);
  assert.strictEqual(views.病因, 0);
  assert.strictEqual(rank(views)[0][0], '机制');
});

test('四层级近乎为空：本章的坐标是环节，不是层级', () => {
  const { levels } = lens(list);
  assert.strictEqual(levels.细胞, 11);
  assert.strictEqual(levels.系统, 4);
  assert.strictEqual(levels.器官, 2);
  assert.strictEqual(levels.组织, 1);
  // 四层级加总远小于三视角加总，正是「无层级可落」的量化痕迹
  const { views } = lens(list);
  const sumL = Object.values(levels).reduce((a, b) => a + b, 0);
  const sumV = Object.values(views).reduce((a, b) => a + b, 0);
  assert.ok(sumL * 4 < sumV, `四层级 ${sumL} 不应接近三视角 ${sumV}`);
});

test('数值核验：6 个小节的 valueLike 全为 0，没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 6);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('第一层：致热原两类，外源性在前段、内源性在后段，两类都在正文有落点', () => {
  assert.deepStrictEqual(PYROGENS.map((p) => p.name), ['外源性', '内源性']);
  const found = cover(list, PYROGENS);
  for (const p of found) assert.ok(p.units.length > 0, `${p.name} 在正文里没有落点`);
  assert.ok(found[0].units.includes('6.3.1') && found[1].units.includes('6.3.1'));
  assert.ok(/前段/.test(PYROGENS[0].at) && /后段/.test(PYROGENS[1].at));
});

test('第二层：感受 / 中枢 / 效应三环节齐备，中枢环节落点最多（发热的关键变化在这里）', () => {
  assert.deepStrictEqual(LINKS.map((l) => l.name), ['感受环节', '中枢环节', '效应环节']);
  const found = cover(list, LINKS);
  for (const l of found) assert.ok(l.units.length > 0, `${l.name} 未被任何小节提到`);
  const byName = Object.fromEntries(found.map((l) => [l.name, l.units.length]));
  assert.ok(byName.中枢环节 > byName.感受环节, '中枢环节落点应多于感受环节');
  assert.ok(byName.中枢环节 > byName.效应环节, '中枢环节落点应多于效应环节');
});

test('第三层：三个分期 = 调定点与体温的三种相对位置，各自主讲小节就位', () => {
  assert.deepStrictEqual(STAGES.map((s) => s.name), ['体温上升期', '高热持续期', '退热期']);
  assert.deepStrictEqual(STAGES.map((s) => s.rel), ['调定点高于体温', '两者大体相当', '调定点低于体温']);
  assert.deepStrictEqual(STAGES.map((s) => s.net), ['产热多于散热', '产热与散热相对平衡', '散热多于产热']);
  const found = cover(list, STAGES);
  for (let i = 0; i < STAGES.length; i += 1) {
    assert.ok(found[i].units.includes(STAGES[i].sub), `${STAGES[i].name} 主讲 ${STAGES[i].sub} 未提到`);
  }
});

test('调定点覆盖全部 6 个小节：它是三个分期的共同尺度', () => {
  const sp = cover(list, ['调定点'])[0];
  assert.strictEqual(sp.units.length, 6);
});

test('边界句覆盖：不作疾病诊断、不写数值、具备资质、留痕、中性表述都在正文出现', () => {
  assert.deepStrictEqual(BOUNDARY, ['不作疾病诊断', '不写数值', '具备资质', '留痕', '中性表述']);
  for (const b of cover(list, BOUNDARY)) assert.ok(b.units.length > 0, `${b.name} 未被任何小节写到`);
  // 6.3.3 是机制表述边界专节：五类痕迹齐全
  const b = list.find((u) => u.sub === '6.3.3');
  for (const k of BOUNDARY) assert.ok(b.rawBody.includes(k), `6.3.3 缺「${k}」`);
});

test('两节各 3 个小节，每节字数都在 5000 字以上（底本按节均分，没有薄节）', () => {
  const secs = bySection(list);
  assert.strictEqual(secs.size, 2);
  for (const [sec, g] of secs) {
    assert.strictEqual(g.units, 3, `${sec} 小节数`);
    assert.ok(g.chars > 5000, `${sec} 只有 ${g.chars} 字`);
  }
});

test('本章 6 个小节没有独立学习目标：底本把 7 条章级目标写在 6.1.1（上半章）', () => {
  const withGoals = list.filter((u) => (u.goals || []).length > 0);
  assert.deepStrictEqual(withGoals.map((u) => u.sub), []);
  // 目标确实存在，只是落在 6.1.1：从正文里能读出来，说明「没有独立目标」不是抄漏
  const head = units.units.find((u) => u.sub === '6.1.1');
  assert.strictEqual((head.goals || []).length, 7);
  assert.ok(head.rawBody.includes('【学习目标】'));
  assert.ok(list.every((u) => !u.rawBody.includes('【学习目标】')), '本章正文不应再出现学习目标块');
});

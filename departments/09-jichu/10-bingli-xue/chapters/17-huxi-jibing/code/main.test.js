#!/usr/bin/env node
/**
 * 第 17 章 呼吸系统疾病 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、词频重心、链条是否写全、数值是否为 0。
 * 不锁死正文措辞，教材改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  PNEUMONIA,
  RIGHT_HEART,
  COPD_TRIO,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  bySection,
  chainUnits,
} = require('./main');

const units = load();
const list = chapterUnits(units);

test('本章 12 个知识单元，分属 4 节，正文合计 20381 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 20381);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '17.1.1', '17.1.2', '17.1.3',
    '17.2.1', '17.2.2', '17.2.3',
    '17.3.1', '17.3.2', '17.3.3',
    '17.4.1', '17.4.2', '17.4.3',
  ]);
});

test('三视角合计 615 次，形态是主轴、机制约占四分之一', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 615);
  assert.strictEqual(views.形态, 476);
  assert.strictEqual(views.机制, 106);
  assert.strictEqual(views.病因, 33);
  assert.strictEqual(rank(views)[0][0], '形态');
  assert.ok(share(views, '形态') > 0.77);
});

test('四层级合计 650 次，落在器官层（本章讲的是肺泡与气道的形态）', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 650);
  assert.strictEqual(levels.器官, 446);
  assert.strictEqual(levels.组织, 97);
  assert.strictEqual(levels.系统, 65);
  assert.strictEqual(levels.细胞, 42);
  assert.strictEqual(rank(levels)[0][0], '器官');
  assert.ok(share(levels, '器官') > 0.68);
});

test('数值核验：12 个单元的 valueLike 全为 0，没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 12);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('大叶性肺炎三阶段只在 17.3.1 写全：一处写全、其余承接', () => {
  assert.deepStrictEqual(PNEUMONIA, ['充血', '纤维素', '消散']);
  assert.deepStrictEqual(chainUnits(list, PNEUMONIA), ['17.3.1']);
});

test('由肺及心的链条被四个单元写全，是本章唯一被反复复述的跨器官关系', () => {
  assert.deepStrictEqual(RIGHT_HEART, ['肺泡壁', '血管床', '右心']);
  assert.deepStrictEqual(chainUnits(list, RIGHT_HEART), ['17.1.2', '17.1.3', '17.2.1', '17.2.2']);
});

test('慢阻肺三类别被三个单元写全，且不含只讲病因的 17.2.1', () => {
  assert.deepStrictEqual(COPD_TRIO, ['慢性支气管炎', '肺气肿', '小气道']);
  const hit = chainUnits(list, COPD_TRIO);
  assert.deepStrictEqual(hit, ['17.1.2', '17.1.3', '17.4.3']);
  assert.ok(!hit.includes('17.2.1'));
});

test('四节各 3 个单元，每节汉字数在 5000 以上（教材按节均分，没有薄节）', () => {
  const secs = bySection(list);
  assert.strictEqual(secs.size, 4);
  for (const [sec, g] of secs) {
    assert.strictEqual(g.units, 3, `${sec} 单元数`);
    assert.ok(g.hanzi > 5000, `${sec} 只有 ${g.hanzi} 字`);
  }
});

test('每单元 brief 都带「不写数值与单位」的口径句', () => {
  for (const u of list) assert.match(u.brief, /不写数值与单位/, `${u.sub} brief 缺口径`);
});

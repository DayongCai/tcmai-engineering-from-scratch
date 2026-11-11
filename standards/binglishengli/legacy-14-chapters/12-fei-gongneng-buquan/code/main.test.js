#!/usr/bin/env node
/**
 * 第 12 章 肺功能不全 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、词频重心、链条是否写全、数值是否为 0。
 * 不锁死正文措辞，底本改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  EXCHANGE,
  VENTILATION,
  STEPS,
  LIMIT,
  BOUNDARY,
  baseUnits,
  measureUnits,
  shape,
  lens,
  rank,
  total,
  valueAudit,
  chainUnits,
} = require('./main');

const list = baseUnits();
const measured = measureUnits();

test('本章 3 个小节，1 节，去空白字符数合计 5348', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 3);
  assert.strictEqual(s.secs, 1);
  assert.strictEqual(s.chars, 5348);
  assert.deepStrictEqual(list.map((u) => u.sub), ['10.3.1', '10.3.2', '10.3.3']);
});

test('小节标题去掉重复编号，与底本一致', () => {
  assert.deepStrictEqual(list.map((u) => u.title), [
    '换气障碍类别的表述', '通气障碍类别的表述', '叙述边界要求',
  ]);
  for (const u of list) assert.ok(!u.title.startsWith(u.sub), `${u.sub} 标题仍在重复编号`);
});

test('三视角合计 84 次，机制是主轴、病因几乎不写', () => {
  const { views } = lens(measured);
  assert.strictEqual(total(views), 84);
  assert.strictEqual(views.机制, 52);
  assert.strictEqual(views.机能, 31);
  assert.strictEqual(views.病因, 1);
  assert.strictEqual(rank(views)[0][0], '机制');
});

test('四层级合计 29 次，落在器官层（本章讲的是肺这个器官的两个环节）', () => {
  const { levels } = lens(measured);
  assert.strictEqual(total(levels), 29);
  assert.strictEqual(levels.器官, 15);
  assert.strictEqual(levels.系统, 9);
  assert.strictEqual(levels.组织, 5);
  assert.strictEqual(levels.细胞, 0);
  assert.strictEqual(rank(levels)[0][0], '器官');
});

test('数值核验：正文没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 3);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.samples, []);
  for (const u of measured) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('换气三类只在 10.3.1 写全：弥散、比例失调、解剖分流', () => {
  assert.deepStrictEqual(EXCHANGE, ['弥散障碍', '比例失调', '解剖分流']);
  assert.deepStrictEqual(chainUnits(list, EXCHANGE), ['10.3.1']);
});

test('通气四类只在 10.3.2 写全：驱动、传导、执行、气道通畅', () => {
  assert.deepStrictEqual(VENTILATION, ['中枢驱动', '神经肌肉传导', '胸廓与呼吸肌', '气道通畅性']);
  assert.deepStrictEqual(chainUnits(list, VENTILATION), ['10.3.2']);
});

test('换气与通气两个环节名在前两节都出现，第三节只谈边界', () => {
  assert.deepStrictEqual(STEPS, ['换气', '通气']);
  assert.deepStrictEqual(chainUnits(list, STEPS), ['10.3.1', '10.3.2']);
  const boundUnit = list.find((u) => u.sub === '10.3.3');
  assert.ok(!boundUnit.rawBody.includes('比例失调'), '边界节不该复述换气三类');
});

test('限制性、阻塞性与混合类别只在 10.3.2 写全，且不押轻重', () => {
  assert.deepStrictEqual(LIMIT, ['限制性', '阻塞性', '混合类别']);
  assert.deepStrictEqual(chainUnits(list, LIMIT), ['10.3.2']);
  const v = list.find((u) => u.sub === '10.3.2');
  assert.match(v.rawBody, /不作轻重比较/);
});

test('两条叙述边界只在 10.3.3 写全，且写成可逐项核对的规则', () => {
  assert.deepStrictEqual(BOUNDARY, ['不作疾病诊断', '不写具体数值与计量单位']);
  assert.deepStrictEqual(chainUnits(list, BOUNDARY), ['10.3.3']);
});

test('每小节都写着「只写类别与关系」的口径句，且篇幅相当', () => {
  for (const u of measured) {
    assert.match(u.brief, /只写类别与关系/, `${u.sub} brief 缺口径`);
    assert.ok(u.hanzi > 1500, `${u.sub} 只有 ${u.hanzi} 字，篇幅异常`);
  }
  for (const u of list) {
    assert.ok(u.chars > 1700 && u.chars < 1900, `${u.sub} 去空白 ${u.chars} 字，与「每小节约 1800」不符`);
  }
});

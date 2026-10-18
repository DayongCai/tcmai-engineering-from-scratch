'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { checkCondition, PULSES, SUPPLEMENTS } = require('./main.js');

test('四条件全满足 + 平旦 → ok', () => {
  const r = checkCondition({ rested: true, fasted: true, calm: true, hour: 6 });
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.deviations, []);
});

test('门诊下午：偏差项逐条列出，且不作废测量', () => {
  const r = checkCondition({ rested: false, fasted: true, calm: true, hour: 15 });
  assert.strictEqual(r.ok, false);
  assert.ok(r.deviations.length >= 2);
  assert.match(r.advice, /记录/);
});

test('平旦边界：4–7 时算平旦，8 时不算', () => {
  assert.strictEqual(checkCondition({ rested: true, fasted: true, calm: true, hour: 4 }).ok, true);
  assert.strictEqual(checkCondition({ rested: true, fasted: true, calm: true, hour: 7 }).ok, true);
  assert.strictEqual(checkCondition({ rested: true, fasted: true, calm: true, hour: 8 }).ok, false);
});

test('脉象四条齐备，每条都有原文与边界', () => {
  assert.deepStrictEqual(PULSES.map((p) => p.name), ['长', '短', '数', '大']);
  for (const p of PULSES) {
    assert.match(p.text, /则/);
    assert.ok(p.boundary.length > 5, `${p.name} 缺边界`);
  }
});

test('补充项与原文四条件分开：药物/体位/温度不得混入 deviations 文案', () => {
  assert.ok(SUPPLEMENTS.some((s) => s.includes('服药')));
  const r = checkCondition({ rested: true, fasted: true, calm: true, hour: 6 });
  assert.ok(!r.deviations.join('').includes('体位'));
});

test('全默认值（什么都不传）必须判定不成立，不许默认满足', () => {
  const r = checkCondition();
  assert.strictEqual(r.ok, false);
  assert.ok(r.deviations.length === 4);
});

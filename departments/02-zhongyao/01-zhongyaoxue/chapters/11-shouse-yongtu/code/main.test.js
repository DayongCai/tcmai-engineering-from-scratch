'use strict';
/**
 * 第 11 章（收涩药 / 涌吐药）章内单测
 *   node --test code/main.test.js
 *
 *   1. 规模       —— 两章各自计数与合计
 *   2. 结构       —— 四节名册、小节/段/药的对应
 *   3. 教材原文核对 —— 底本段落与 drugs.json 字段逐字相同
 *   4. 本仓库口径  —— 四气不压平、毒性只有文本标记
 *   5. 教学边界    —— main.js 最后一行必须是边界声明
 */
const assert = require('node:assert');
const test = require('node:test');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const m = require('./main.js');

// ---------- 1. 规模 ----------

test('规模：26 章 3/14/42/2523、27 章 1/3/9/460，合计 4 节 / 17 小节 / 51 段 / 2983 字', () => {
  const s = m.scale();
  const [a, b] = s.per;
  assert.deepStrictEqual(
    [a.secs, a.subs, a.paras, a.chars, a.drugs],
    [3, 14, 42, 2523, 14],
  );
  assert.deepStrictEqual(
    [b.secs, b.subs, b.paras, b.chars, b.drugs],
    [1, 3, 9, 460, 3],
  );
  assert.deepStrictEqual([s.secs, s.subs, s.paras, s.chars, s.drugs], [4, 17, 51, 2983, 17]);
});

test('规模：段数 = 药味数 × 3（每味 3 段），合计 51 = 17 × 3', () => {
  const s = m.scale();
  assert.strictEqual(s.paras, s.drugs * 3);
  assert.strictEqual(s.charsPerDrug, 175.5);
});

// ---------- 2. 结构 ----------

test('结构：四节为 固表止汗 2 / 敛肺涩肠 5 / 固精缩尿止带 7 / 涌吐 3', () => {
  const secs = m.sections();
  assert.deepStrictEqual(secs.map((s) => s.no), ['26.1', '26.2', '26.3', '27.1']);
  assert.deepStrictEqual(secs.map((s) => s.drugs.length), [2, 5, 7, 3]);
  assert.strictEqual(secs.reduce((n, s) => n + s.drugs.length, 0), 17);
});

test('结构：小节数等于药味数，段数等于小节数 × 3', () => {
  for (const s of m.sections()) {
    assert.strictEqual(s.subs, s.drugs.length, `${s.no} 小节与药味不等`);
    assert.strictEqual(s.paras, s.subs * 3, `${s.no} 段数不等于小节 × 3`);
  }
});

// ---------- 3. 教材原文核对 ----------

test('教材原文：26.2.1 五味子三段与 drugs.json 三个字段逐字相同', () => {
  const ch = m.chapters()[0];
  const sub = ch.secs.find((s) => s.no === '26.2').subs.find((u) => u.no === '26.2.1');
  const d = m.drugs().find((x) => x.name === '五味子');
  assert.strictEqual(sub.title, '五味子');
  assert.strictEqual(sub.paras.length, 3);
  assert.strictEqual(sub.paras[0], d.fields['来源与性味归经']);
  assert.strictEqual(sub.paras[1], d.fields['功效与主治']);
  assert.strictEqual(sub.paras[2], d.fields['用法用量与使用注意']);
});

test('教材原文：乌梅归四条经、常山首段含「有毒」', () => {
  const wm = m.natureOf('乌梅');
  assert.ok(wm.sentence.includes('性平，味酸、涩，归肝、脾、肺、大肠经'), wm.sentence);
  assert.deepStrictEqual(wm.guijing, ['肝', '脾', '肺', '大肠']);
  const cs = m.natureOf('常山');
  assert.ok(/有毒/.test(cs.sentence), cs.sentence);
  assert.strictEqual(cs.poison, true);
});

// ---------- 4. 本仓库口径 ----------

test('口径：四气合计为 平7 / 凉1 / 温4 / 寒4 / 微温1，不补零项', () => {
  const got = Object.fromEntries(m.byQi().map((x) => [x.qi, x.n]));
  assert.deepStrictEqual(got, { 寒: 4, 凉: 1, 平: 7, 温: 4, 微温: 1 });
  assert.ok(!('微寒' in got) && !('热' in got), '缺项不应出现');
});

test('口径：收涩 14 味无一标「有毒」，涌吐 3 味全部标「有毒」，且全部性寒', () => {
  const [shou, tu] = m.direction();
  assert.strictEqual(shou.drugs, 14);
  assert.deepStrictEqual(shou.poison, []);
  assert.strictEqual(tu.drugs, 3);
  assert.deepStrictEqual(tu.poison, ['常山', '瓜蒂', '胆矾']);
  assert.deepStrictEqual(tu.qi, [{ qi: '寒', n: 3 }]);
});

test('口径：收涩归肾最多（9 味），涌吐无一归肾', () => {
  const [shou, tu] = m.direction();
  assert.strictEqual(shou.topJing[0][0], '肾');
  assert.strictEqual(shou.topJing[0][1], 9);
  const tuJing = m.jingCount(m.drugs().filter((d) => d.chapter === '27')).map(([j]) => j);
  assert.ok(!tuJing.includes('肾'), `涌吐药归经里出现了肾：${tuJing.join('、')}`);
});

// ---------- 5. 教学边界 ----------

test('教学边界：main.js 最后一行含「教学边界」与「不构成用药依据」', () => {
  const out = execFileSync('node', ['code/main.js'], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  });
  const last = out.trim().split('\n').filter(Boolean).pop();
  assert.ok(/教学边界/.test(last), last);
  assert.ok(/不构成用药依据/.test(last), last);
});

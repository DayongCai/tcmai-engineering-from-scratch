'use strict';
const assert = require('node:assert');
const test = require('node:test');

const {
  CHAPTER, VIEWS, LEVELS, unitsOf, tally, density,
  sectionStats, unitStats, chapterStats, tightest, sparsest, organLevelGap, selfCheck,
} = require('./main.js');

test('规模：12 小节、4 节、教材 20576 字（从 units.json 现算）', () => {
  const s = chapterStats();
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 20576);
});

test('三视角：机能 520 最多，形态 160，代谢 22（本章以机能为轴）', () => {
  const s = chapterStats();
  assert.strictEqual(s.views['机能'], 520);
  assert.strictEqual(s.views['形态'], 160);
  assert.strictEqual(s.views['代谢'], 22);
  assert.ok(s.views['机能'] > s.views['形态'] && s.views['形态'] > s.views['代谢']);
  assert.deepStrictEqual(Object.keys(s.views), VIEWS);
});

test('四层级：系统 122、细胞 20、器官 15、组织 0 —— 组织层全章缺席', () => {
  const s = chapterStats();
  assert.strictEqual(s.levels['系统'], 122);
  assert.strictEqual(s.levels['细胞'], 20);
  assert.strictEqual(s.levels['器官'], 15);
  assert.strictEqual(s.levels['组织'], 0);
  assert.strictEqual(organLevelGap(), 12);
  assert.deepStrictEqual(Object.keys(s.levels), LEVELS);
});

test('数值零容忍：全章 valueLike 0，27 个阿拉伯数字全是列表序号', () => {
  const s = chapterStats();
  assert.strictEqual(s.valueLike, 0);
  assert.strictEqual(s.digits, 27);
  assert.strictEqual(s.digits, s.listItems);
  assert.ok(unitsOf().every((u) => u.measure.valueLike === 0));
});

test('逐节密度递减：58.1 → 44.7 → 41.4 → 23.8，四节字数合计等于全章', () => {
  const secs = sectionStats();
  assert.deepStrictEqual(secs.map((x) => x.density), [58.1, 44.7, 41.4, 23.8]);
  for (let i = 1; i < secs.length; i += 1) assert.ok(secs[i - 1].density > secs[i].density);
  assert.strictEqual(secs.reduce((n, x) => n + x.hanzi, 0), 20576);
  assert.strictEqual(secs.reduce((n, x) => n + x.hits, 0), 859);
});

test('最密的一节不是电活动，是中枢抑制；最疏的是皮层生物电活动', () => {
  assert.strictEqual(tightest().sub, '10.2.2');
  assert.strictEqual(tightest().hits, 126);
  assert.strictEqual(tightest().views['机能'], 110);
  assert.strictEqual(sparsest().sub, '10.4.1');
  assert.strictEqual(sparsest().hits, 10);
  assert.strictEqual(sparsest().density, 5.8);
});

test('「不给值」类声明全章 5 处；密度函数按每千字取一位小数', () => {
  // 5 处 = 10.1.1 与 10.1.2/10.2.3/10.3.3/10.4.2 各 1 处。10.1.1 那处在学习目标里
  // （「不写数值与单位与正常值」），它算不算取决于 body 的口径，所以口径先定死再说数：
  // units.json 的 body 恒等于原文整段（见 scripts/build_shengli_text.py），不是「去目标余文」。
  assert.strictEqual(chapterStats().decl, 5);
  assert.strictEqual(density(4, 20576), 0.2);
  assert.strictEqual(density(0, 1000), 0);
  const d = unitStats().filter((u) => u.decl > 0).map((u) => u.sub);
  assert.deepStrictEqual(d, ['10.1.1', '10.1.2', '10.2.3', '10.3.3', '10.4.2']);
});

test('口径自洽：tally 的命中合计等于三视角与四层级两栏之和；自检全过', () => {
  const t = tally(unitsOf());
  const byHand = Object.values(t.views).reduce((a, b) => a + b, 0) + Object.values(t.levels).reduce((a, b) => a + b, 0);
  assert.strictEqual(t.hits, byHand);
  assert.strictEqual(t.hits, 859);
  assert.strictEqual(CHAPTER, '10');
  assert.ok(selfCheck().every((c) => c.ok));
});

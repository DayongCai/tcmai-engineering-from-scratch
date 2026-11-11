'use strict';

const assert = require('node:assert');
const test = require('node:test');
const { traits, sheng, ke, graphShape, isomorphic, categories, methods, TRAITS, XING, CATS, supplements } = require('./main.js');

test('五特性 5 条全部命中原文；土用「爰」不用「曰」', () => {
  const tr = traits();
  assert.strictEqual(tr.length, 5);
  assert.ok(tr.every((x) => x.inText), '每条原文都应命中');
  assert.strictEqual(tr.filter((x) => x.verb === '曰').length, 4);
  assert.strictEqual(tr.filter((x) => x.verb === '爰').length, 1);
  const tu = tr.find((x) => x.xing === '土');
  assert.strictEqual(tu.verbatim, '土爰稼穑');
  assert.strictEqual(TRAITS.length, 5);
});

test('相生 5 边、相克 5 边，都是单环', () => {
  const s = sheng();
  const k = ke();
  assert.strictEqual(s.n, 5);
  assert.strictEqual(k.n, 5);
  assert.deepStrictEqual(s.edges, ['木→火', '火→土', '土→金', '金→水', '水→木']);
  assert.deepStrictEqual(k.edges, ['木→土', '土→水', '水→火', '火→金', '金→木']);
});

test('两图每节点出度 1、入度 1；图论同构', () => {
  const s = graphShape(sheng().edges);
  const k = graphShape(ke().edges);
  for (const x of XING) {
    assert.strictEqual(s.out[x], 1);
    assert.strictEqual(s.inn[x], 1);
    assert.strictEqual(k.out[x], 1);
    assert.strictEqual(k.inn[x], 1);
  }
  assert.strictEqual(isomorphic().sameDegreeSeq, true);
});

test('归类：7 类名全部出现，但只有 4 条实例，无 7×5 全表', () => {
  const c = categories();
  assert.strictEqual(c.nNamed, 7);
  assert.deepStrictEqual(c.named, CATS);
  assert.strictEqual(c.instances.length, 4);
  assert.strictEqual(c.fullTable, false);
  assert.ok(c.instances.every((i) => i.xing === '木'), '教材举例全部指向木');
});

test('思维方法 2 个、谬误 2 类（取象比类 vs 机械类比是两回事）', () => {
  const m = methods();
  assert.deepStrictEqual(m.names, ['取象比类', '推演络绎']);
  assert.deepStrictEqual(m.errors, ['机械类比', '以偏概全']);
  assert.notStrictEqual(m.names[0], m.errors[0]);
});

test('4 条实例覆盖的类不重复计数（五色/五味/脉 合为一条）', () => {
  const c = categories();
  const cats = new Set(c.instances.map((i) => i.cat));
  assert.strictEqual(cats.size, 4);
});

test('外源补录：五行五方九目 45 格全部有落点', () => {
  const sp = supplements();
  assert.strictEqual(sp.length, 2); // 五行归类 + 五运六气七篇（第二轮）
  const wx = sp.find((x) => x.id === 'wuxing-5x9');
  const yq = sp.find((x) => x.id === 'yunqi-7pian');
  assert.strictEqual(wx.supplied, 5);
  assert.ok(wx.source.includes('陰陽應象大論篇第五'));
  assert.strictEqual(yq.supplied, 7);
  assert.ok(yq.items.some((x) => x.includes('六元正纪大论')));
});

test('底本口径不变：categories() 仍只有 4 条实例、无全表', () => {
  assert.strictEqual(categories().instances.length, 4);
  assert.strictEqual(categories().fullTable, false);
});

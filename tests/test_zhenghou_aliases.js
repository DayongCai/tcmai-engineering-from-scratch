#!/usr/bin/env node
/**
 * tests/test_zhenghou_aliases.js —— 口语别名表的三条硬线
 *
 * 这张表最容易出的错不是「少」，而是「假」：
 *   ① 右值写了个词表里没有的说法（映射完照样落不到位/性，用户以为系统认得）；
 *   ② 左=右的空转条目（精确匹配本来就会命中，留着只让表看起来更大）；
 *   ③ 四个高频主诉域全是「看起来覆盖了」，实测复合主诉仍然零候选。
 * 所以本测试只盯这三条，不追求条数。
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const STD = path.join(ROOT, 'standards', 'zhenghou-cidian');
const A = JSON.parse(fs.readFileSync(path.join(STD, '口语别名.json'), 'utf8'));
const enc = require(path.join(ROOT, 'scripts', 'zhenghou_encode.js'));
const DB = enc.load();

const SPLIT = /[、，,；;/｜|]+/;
function vocab() {
  const v = new Set();
  for (const w of JSON.parse(fs.readFileSync(path.join(STD, '语素-位.json'), 'utf8')).证位) {
    for (const t of (w.见症 || '').split(SPLIT)) if (t.trim()) v.add(t.trim());
  }
  for (const y of JSON.parse(fs.readFileSync(path.join(STD, '语素-性.json'), 'utf8')).类) {
    for (const t of (y.见症 || '').split(SPLIT)) if (t.trim()) v.add(t.trim());
  }
  for (const t of JSON.parse(fs.readFileSync(path.join(STD, '语素-态.json'), 'utf8')).态) v.add(t.zh);
  return v;
}

test('L1 每条别名的右值都在词表里（位/性见症 或 态名）', () => {
  const v = vocab();
  const bad = Object.entries(A.别名).filter(([, to]) => !v.has(to));
  assert.deepStrictEqual(bad, [], '右值不在词表：' + JSON.stringify(bad.slice(0, 5)));
});

test('L2 不许出现「左=右」的空转条目', () => {
  const self = Object.entries(A.别名).filter(([from, to]) => from === to).map(([k]) => k);
  assert.deepStrictEqual(self, [], '空转别名：' + self.join('、'));
});

test('L3 四个主诉域都有实配，且表总量回落到「有问题就说」的规模', () => {
  assert.ok(Object.keys(A.别名).length >= 130, '别名只有 ' + Object.keys(A.别名).length + ' 条');
  const domains = {
    头痛: ['头疼', '脑袋疼', '偏头疼', '脑袋发胀', '天旋地转', '眼前发花'],
    二便: ['拉稀', '大便不成形', '大便干结', '尿不出来', '小便黄', '尿量少'],
    睡眠: ['睡不着', '入睡难', '老做梦', '半夜老醒', '心烦睡不着', '心慌睡不着'],
    情绪: ['爱发火', '脾气大', '爱叹气', '容易受惊', '心里烦', '一点就着'],
  };
  for (const [name, keys] of Object.entries(domains)) {
    const hit = keys.filter((k) => k in A.别名);
    assert.strictEqual(hit.length, keys.length, `${name}域缺：` + keys.filter((k) => !(k in A.别名)).join('、'));
  }
  // 词表里没有目标的，必须写在 $未覆盖 里，而不是硬造关键字
  assert.ok(A.$未覆盖 && Object.keys(A.$未覆盖).length >= 4, '缺 $未覆盖 登记');
});

test('L4 真实复合主诉能出候选（9/10 以上），且别名在归一里生效', () => {
  const cases = [
    '睡不好 心慌 口苦', '拉稀 怕冷 没劲', '头疼 口干 烦躁', '尿黄 尿少 腰酸',
    '爱叹气 胸口闷 脉弦', '脑袋沉 没胃口 舌苔白', '半夜老醒 心烦 手心热',
    '尿里有血 腰酸 乏力', '一惊一乍 心慌 失眠', '头疼 头晕 口苦',
  ];
  let ok = 0;
  for (const s of cases) {
    const r = enc.encode(DB, s);
    if (r['候选'].length >= 1) ok += 1;
  }
  assert.ok(ok >= 9, `复合主诉只出候选 ${ok}/${cases.length}`);
  const one = enc.encode(DB, '睡不好 心慌 口苦');
  assert.ok(one['归一'].some((n) => n['原词'] === '睡不好' && n['方式'] === 'alias'), '别名没生效');
});

test('L5 单说一个「只落性」的口语不出候选，但必须给追问（不判空）', () => {
  const r = enc.encode(DB, '便秘');
  assert.strictEqual(r['候选'].length, 0, '只有性侧，按设计不该出候选');
  assert.ok(r['追问'].length >= 1, '零候选时必须追问，而不是沉默');
});

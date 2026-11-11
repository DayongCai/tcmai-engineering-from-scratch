'use strict';
/**
 * 第 9 章的单测 = 「docs 里的数与代码里的数同源」这条契约的执行器。
 * 断言写死具体值是有意的：底本一改（重新抽取、重新分节），测试必须失败，
 * 逼写的人回头改 docs，而不是让文档悄悄过期。
 */
const assert = require('node:assert');
const test = require('node:test');
const {
  chap,
  subs,
  shape,
  slots,
  vocabulary,
  pairs,
  zhengPerDisease,
  formulaSpread,
  singleUse,
  syndromeClash,
  valueSpots,
  cautions,
  totals,
} = require('./main.js');

test('章的规模：9 节 · 55 小节 · 41421 汉字 · 量值 4', () => {
  const t = totals();
  assert.strictEqual(t.secs, 9);
  assert.strictEqual(t.subs, 55);
  assert.strictEqual(t.hanzi, 41421);
  assert.strictEqual(t.valueLike, 4);
});

test('量值复算与底本口径一致：VALUE 匹配数 = counts.valueLike', () => {
  const hit = subs().reduce((n, u) => n + (u.items[0].body.match(/\d+(?:\.\d+)?\s*(?:mg|μg|g|kg|ml|mL|L|克|钱|两|枚|片|粒|丸|剂|次|日|天|周|个月|年|小时|分钟)/g) || []).length, 0);
  assert.strictEqual(hit, 4);
  assert.strictEqual(hit, chap().counts.valueLike);
  assert.deepStrictEqual(valueSpots().map((v) => v.sub), ['9.3.4', '9.5.4']);
});

test('节—小节骨架：血证 11、虚劳 9，其余七病证各 5', () => {
  const s = shape();
  assert.deepStrictEqual(
    s.secTable.map((x) => x.subs),
    [5, 11, 5, 5, 5, 5, 9, 5, 5]
  );
  assert.strictEqual(s.secTable.reduce((n, x) => n + x.subs, 0), 55);
});

test('槽位词表：证治 10 · 概述 9 · 病因病机 9 · 预防调护 9 · 按语 9 · 辨证论治 7 · 辨证要点 2', () => {
  assert.deepStrictEqual(vocabulary(), [
    { kind: '证治', n: 10 },
    { kind: '概述', n: 9 },
    { kind: '病因病机', n: 9 },
    { kind: '预防调护', n: 9 },
    { kind: '按语', n: 9 },
    { kind: '辨证论治', n: 7 },
    { kind: '辨证要点', n: 2 },
  ]);
  // 只有血证与虚劳长出了「证治」这一层
  const withZhengzhi = slots().filter((x) => x.zhengzhi).map((x) => x.no);
  assert.deepStrictEqual(withZhengzhi, ['9.2', '9.7']);
});

test('证—方对 71 个；血证 18 证 / 虚劳 14 证；证数 ≠ 小节数', () => {
  const p = pairs();
  assert.strictEqual(p.length, 71);
  assert.strictEqual(totals().distinctZheng, 69);
  const bySec = Object.fromEntries(zhengPerDisease().map((r) => [r.no, r.zheng]));
  assert.deepStrictEqual(bySec, {
    '9.1': 6, '9.2': 18, '9.3': 6, '9.4': 5, '9.5': 4, '9.6': 7, '9.7': 14, '9.8': 5, '9.9': 6,
  });
  assert.strictEqual(Object.values(bySec).reduce((a, b) => a + b, 0), 71);
  // 证治容器 10 个，平铺辨证论治 7 个
  assert.strictEqual(totals().zhengzhiSubs, 10);
  assert.strictEqual(totals().plainSubs, 7);
});

test('每条证—方对都取到证名与方名，且方名带「加减」', () => {
  for (const p of pairs()) {
    assert.ok(p.zheng.endsWith('证'), `${p.sub} 证名异常：${p.zheng}`);
    assert.ok(!p.zheng.includes('病证'), `${p.sub} 取到的是病名不是证名：${p.zheng}`);
    assert.ok(p.fang.length >= 3, `${p.sub} 方名过短：${p.fang}`);
    assert.ok(/加减$/.test(p.fang), `${p.sub} 方名未带加减：${p.fang}`);
  }
});

test('方的跨病复用：归脾汤 7 处 / 4 病；去重 59（跨病 6 · 单病 53）', () => {
  const sp = formulaSpread();
  const guipi = sp.find((x) => x.fang === '归脾汤');
  assert.deepStrictEqual([guipi.n, guipi.diseaseCount], [7, 4]);
  assert.deepStrictEqual(guipi.diseases, ['郁证', '血证', '自汗盗汗', '内伤发热']);
  assert.deepStrictEqual(
    sp.filter((x) => x.diseaseCount > 1).map((x) => x.fang),
    ['归脾汤', '龙胆泻肝汤', '丹栀逍遥散', '玉女煎', '金匮肾气丸', '血府逐瘀汤']
  );
  const su = singleUse();
  assert.deepStrictEqual([su.distinct, su.multi, su.single], [59, 6, 53]);
});

test('证名不是主键：胃热炽盛证跨病同方，阴虚火旺证跨病异方', () => {
  const clash = syndromeClash();
  assert.strictEqual(clash.length, 2);
  const wei = clash.find((c) => c.zheng === '胃热炽盛证');
  assert.deepStrictEqual(wei.where, ['9.2.4血证', '9.4.3消渴']);
  assert.strictEqual(wei.sameFang, true);
  assert.deepStrictEqual(wei.fangs, ['玉女煎加减']);
  const yin = clash.find((c) => c.zheng === '阴虚火旺证');
  assert.deepStrictEqual(yin.where, ['9.2.5血证', '9.5.3自汗盗汗']);
  assert.strictEqual(yin.sameFang, false);
  assert.deepStrictEqual(yin.fangs, ['六味地黄丸合茜根散加减', '当归六黄汤加减']);
});

test('按语里的代价句：中病即止 5 · 顾护胃气 6', () => {
  const c = Object.fromEntries(cautions().map((x) => [x.w, x.n]));
  assert.strictEqual(c['中病即止'], 5);
  assert.strictEqual(c['顾护胃气'], 6);
});

test('底本正文非空，且每个小节恰好 1 个条目', () => {
  for (const u of subs()) {
    assert.ok(u.items.length === 1, `${u.no} 条目数异常`);
    assert.ok(u.items[0].body.length > 200, `${u.no} 正文过短`);
  }
});

#!/usr/bin/env node
/**
 * tests/test_zhenghou_encode.js —— /encode 参考实现的断言
 *
 * 为什么不只跑 `--check`：`--check` 断言的是「黄金样例对不对」，它验不了
 * 输出契约（字段、上限、确定性）与边界（空输入、乱词、危候开关）。
 * 这两类东西一旦坏掉，APP 侧拿到的是「看起来有结果」的 JSON —— 比报错难查得多。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const enc = require('../scripts/zhenghou_encode.js');

const ROOT = path.resolve(__dirname, '..');
const db = enc.load();
const CASES = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'standards', 'zhenghou-cidian', 'encode-cases.json'), 'utf8')).cases;

test('E1 输出契约：五个顶层字段齐全', () => {
  const r = enc.encode(db, '恶寒重 无汗 脉浮紧');
  for (const k of ['ctx', '归一', '候选', '危候', '未收录词', '提示']) {
    assert.ok(k in r, '缺字段 ' + k);
  }
  assert.ok(Array.isArray(r['候选']) && Array.isArray(r['归一']) && Array.isArray(r['未收录词']));
  assert.strictEqual(typeof r['危候'], 'boolean');
  assert.ok(typeof r['提示'] === 'string' && r['提示'].length > 8);
});

test('E2 候选上限与排序：≤5 条，按 位+性 命中降序', () => {
  const r = enc.encode(db, '脘腹痞胀 便溏 身热不扬 口苦黏 苔黄腻');
  assert.ok(r['候选'].length <= enc.MAX_CAND);
  for (let i = 1; i < r['候选'].length; i += 1) {
    const a = r['候选'][i - 1]['命中位'] + r['候选'][i - 1]['命中性'];
    const b = r['候选'][i]['命中位'] + r['候选'][i]['命中性'];
    assert.ok(a >= b, '排序错：' + a + ' < ' + b);
  }
});

test('E3 黄金样例 15/15（门 + 类 + 危候 三项都对）', () => {
  const bad = [];
  for (const c of CASES) {
    const r = enc.encode(db, c.ctx);
    const top = r['候选'][0];
    const okMen = c['期望门'] ? (!!top && top['门'].startsWith(c['期望门'])) : r['候选'].length === 0;
    const okLei = c['期望类'] ? (!!top && top['类'].startsWith(c['期望类'])) : r['候选'].length === 0;
    const okDanger = r['危候'] === !!c['期望危候'];
    if (!(okMen && okLei && okDanger)) {
      bad.push({ id: c.id, 门: top ? top['门'] : '（无）', 类: top ? top['类'] : '（无）', 危候: r['危候'] });
    }
  }
  assert.deepStrictEqual(bad, []);
});

test('E4 不猜：词表外的说法原样进「未收录词」，且不产生候选', () => {
  const r = enc.encode(db, '这 不是 中医 的 词');
  assert.strictEqual(r['候选'].length, 0);
  assert.ok(r['未收录词'].length >= 3);
  assert.deepStrictEqual(r['归一'], []);
  assert.ok(r['提示'].includes('未匹配'));
});

test('E5 空输入不崩、不臆造候选', () => {
  for (const ctx of ['', '   ', []]) {
    const r = enc.encode(db, ctx);
    assert.strictEqual(r['候选'].length, 0);
  }
});

test('E6 危候开关：脱绝族置真、失守族置假', () => {
  const danger = enc.encode(db, '晨泄 腰腹冷 便溏 畏寒喜按 舌淡胖 阳脱');
  assert.strictEqual(danger['危候'], true, '阳脱应判危候');
  const main = danger['候选'][0];
  assert.ok(main['主候'], '危候样例应给出主候');
  assert.ok(['陷逆', '脱绝'].includes(main['主候族']), '主候族应为陷逆/脱绝，实为 ' + main['主候族']);

  const safe = enc.encode(db, '恶寒重 无汗 脉浮紧');
  assert.strictEqual(safe['危候'], false, '风寒表证不应判危候');
});

test('E7 主候必须属于该证（前缀一致），且族可查', () => {
  const r = enc.encode(db, '脘腹痞胀 便溏 身热不扬 口苦黏 苔黄腻');
  for (const c of r['候选']) {
    if (!c['主候']) continue;
    assert.ok(c['主候'].startsWith(c.full + '-'), c['主候'] + ' 不属于 ' + c.full);
    assert.ok(c['主候名'] && c['主候名'].endsWith('候'), '主候名应以「候」结尾');
  }
});

test('E8 确定性：同输入两次结果完全一致（无时间戳、无随机）', () => {
  const a = enc.encode(db, '胸胁胀满 太息 脉弦');
  const b = enc.encode(db, '胸胁胀满 太息 脉弦');
  assert.deepStrictEqual(a, b);
});

test('E9 归一规则可解释：每条命中都写了方式', () => {
  const r = enc.encode(db, '无汗 脉浮紧');
  assert.ok(r['归一'].length >= 2);
  for (const n of r['归一']) {
    assert.ok(['exact', 'contains', 'prefix', 'vocab-态', 'vocab-候位', 'vocab-证象'].includes(n['方式']), '未知方式 ' + n['方式']);
    assert.ok(n['原词'] && n['词表']);
  }
  // 「无汗」应同时落到类语素（精确）与位语素（前缀 无汗或少汗）
  const wu = r['归一'].filter((n) => n['原词'] === '无汗').map((n) => n['词表']);
  assert.ok(wu.includes('无汗') && wu.includes('无汗或少汗'), '无汗应双落：' + wu.join(','));
});

// ── N 名形校验（附录一：75 证象矩阵）─────────────────────────
// 这组断言的意义：位/性语素能算「像哪一证」，但算不出「这个说法原书里到底有没有」。
// 附录一那张 19×13 矩阵给的是硬边界；这里盯三件事 —— 合法格认得出、空格判得出、拆不开不判。

test('N1 合法格：腠理不宣 = 附录一「腠理×不宣」', () => {
  const v = enc.validateName(db, '腠理不宣');
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v['位'], '腠理');
  assert.strictEqual(v['病机'], '不宣');
  assert.strictEqual(v['表内写法'], '腠理不宣');
});

test('N2 表内写法与常见说法不同也能认：气机郁结属「气机×不通」', () => {
  const v = enc.validateName(db, '气机郁结');
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v['位'], '气机');
  assert.strictEqual(v['病机'], '不通');
});

test('N3 空格必须判否，并给出该位合法组合', () => {
  const v = enc.validateName(db, '腠理枯竭');
  assert.strictEqual(v.ok, false);
  assert.ok(v['说明'].includes('空格'), v['说明']);
  assert.ok(Array.isArray(v['该位合法组合']) && v['该位合法组合'].length >= 3);
  assert.ok(v['该位合法组合'].some((x) => x.includes('腠理不宣')));
});

test('N4 拆不开就不判（ok=null），不许因为认不出就判错', () => {
  const v = enc.validateName(db, '心脉痹阻');
  assert.strictEqual(v.ok, null);
  assert.ok(v['说明'].includes('不判'), v['说明']);
  assert.strictEqual(enc.validateName(db, '').ok, null);
});

test('N5 接进 /encode：证象词只记不判分，且不影响位/性', () => {
  const base = enc.encode(db, '怕冷 无汗');
  const withX = enc.encode(db, '怕冷 无汗 腠理不宣');
  assert.ok(withX['名形校验'].some((n) => n['名'] === '腠理不宣' && n.ok === true), '名形校验没记上');
  assert.ok(withX['归一'].some((n) => n['方式'] === 'vocab-证象'), '归一没有 vocab-证象');
  const a = base['候选'][0];
  const b = withX['候选'][0];
  assert.strictEqual(a.full, b.full, '证象词不该改变首选证');
  assert.strictEqual(a['命中位'], b['命中位'], '证象词不该加位分');
  assert.strictEqual(a['命中性'], b['命中性'], '证象词不该加性分');
});

test('N6 索引与附录一逐格对齐：72 格、每格都有位与病机', () => {
  const X = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'standards', 'zhenghou-cidian', '证象-合法组合.json'), 'utf8'));
  assert.strictEqual(X.count, 72, '证象格数 ' + X.count);
  assert.strictEqual(X.phrases.length, 72);
  let n = 0;
  for (const [col, m] of Object.entries(X.byWei)) {
    assert.ok(X.cols.includes(col), '未登记的列 ' + col);
    for (const [row, text] of Object.entries(m)) {
      n += 1;
      assert.ok(X.rows.includes(row), '未登记的行 ' + row);
      assert.ok(text.length >= 3, '格内文字异常：' + text);
    }
  }
  // 同一格可能有两个写法（原表「气机×不宁」= 气机冲逆 / 气机逆乱），
  // byWei 里只留 canonical，另一个记在 multiText —— 两者相加必须回到 72。
  const extra = Object.values(X.multiText || {}).reduce((k, v) => k + (v.length - 1), 0);
  assert.strictEqual(n + extra, 72, '格数对不上：byWei ' + n + ' + multi ' + extra);
});

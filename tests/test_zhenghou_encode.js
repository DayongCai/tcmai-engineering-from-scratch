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
    assert.ok(['exact', 'contains', 'prefix', 'vocab-态', 'vocab-候位'].includes(n['方式']), '未知方式 ' + n['方式']);
    assert.ok(n['原词'] && n['词表']);
  }
  // 「无汗」应同时落到类语素（精确）与位语素（前缀 无汗或少汗）
  const wu = r['归一'].filter((n) => n['原词'] === '无汗').map((n) => n['词表']);
  assert.ok(wu.includes('无汗') && wu.includes('无汗或少汗'), '无汗应双落：' + wu.join(','));
});

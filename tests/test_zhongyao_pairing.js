'use strict';
/**
 * 配伍对象 + 反畏扫描门（8 项）
 *   1. 图规模：279/287 有对象、1,162 边、995 去重、平均 4.049
 *   2. 入度前 5 固定：白术 35 · 当归 29 · 菊花 20 · 黄连 19 · 牡蛎 19
 *   3. 清单解析：40 对（十八反 30 + 十九畏 10），原文两段在案，不手打
 *   4. 各论踩清单 0 处；教材自标禁忌 1 处（硫黄—芒硝 十九畏）
 *   5. 覆盖率：40 对里两味都在各论 21 对；未收录 8 名固定
 *   6. 证据回查：每个配伍对象的证据片段必须出现在该药三段正文里
 *   7. 对象合法：所有对象都在 287 味里，且不等于本药
 *   8. md 同源：287 行明细 + 数字一致 + 无 undefined
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'standards', 'zhongyao');
const doc = () => JSON.parse(fs.readFileSync(path.join(DIR, 'pairing.json'), 'utf8'));
const drugs = () => JSON.parse(fs.readFileSync(path.join(DIR, 'drugs.json'), 'utf8'));
const md = () => fs.readFileSync(path.join(DIR, 'pairing.md'), 'utf8');

test('1. 图规模', () => {
  const s = doc().stat;
  assert.strictEqual(s.drugs, 287);
  assert.strictEqual(s.withPartners, 279);
  assert.strictEqual(s.edges, 1162);
  assert.strictEqual(s.distinctEdges, 995);
  assert.strictEqual(s.meanPartners, 4.049);
  assert.strictEqual(s.isolated.length, 8);
});

test('2. 入度前 5', () => {
  const top = doc().top.slice(0, 5).map((t) => `${t.name}:${t.indeg}`);
  assert.deepStrictEqual(top, ['白术:35', '当归:29', '菊花:20', '黄连:19', '牡蛎:19']);
});

test('3. 清单解析', () => {
  const d = doc();
  assert.strictEqual(d.stat.conflictPairs, 40);
  const kinds = {};
  for (const p of d.conflictSource.pairs) kinds[p.kind] = (kinds[p.kind] || 0) + 1;
  assert.deepStrictEqual(kinds, { 十八反: 30, 十九畏: 10 });
  assert.ok(d.conflictSource.fan.startsWith('十八反：'), '缺十八反原文');
  assert.ok(d.conflictSource.wei.startsWith('十九畏：'), '缺十九畏原文');
  // 乌头族要展开成 4 名，不能被「^.*、」吞成一个
  const wu = d.conflictSource.pairs.filter((p) => p.kind === '十八反' && p.b === '半夏').map((p) => p.a).sort();
  assert.deepStrictEqual(wu, ['乌头', '川乌', '草乌', '附子'].sort());
});

test('4. 踩清单与自标禁忌', () => {
  const d = doc();
  assert.strictEqual(d.stat.conflictHits, 0, '各论出现了反畏药对作配伍，需人工确认');
  assert.strictEqual(d.stat.conflictWarnings, 1);
  const w = d.conflictHits.find((h) => h.asWarning);
  assert.strictEqual(w.drug, '硫黄');
  assert.strictEqual(w.partner, '芒硝');
  assert.ok(w.evidence.includes('不宜与'), '告警证据应含「不宜与」');
});

test('5. 覆盖率', () => {
  const d = doc();
  assert.strictEqual(d.stat.pairsBothIn, 21);
  assert.strictEqual(d.stat.pairsMissing, 19);
  assert.deepStrictEqual(d.stat.missingNames, ['密陀僧', '巴豆', '水银', '狼毒', '白蔹', '草乌', '藜芦', '赤石脂'].sort());
});

test('6. 证据回查', () => {
  const M = new Map(drugs().drugs.map((x) => [x.name, x]));
  for (const r of doc().rows) {
    const d = M.get(r.name);
    assert.ok(d, `${r.name} 不在 drugs.json`);
    const pool = ['来源与性味归经', '功效与主治', '用法用量与使用注意'].map((f) => String(d.fields[f] || '')).join('\n');
    for (const p of r.partners) assert.ok(pool.includes(p.evidence), `${r.name}→${p.name} 的证据不在正文里：${p.evidence}`);
    for (const p of r.negated) assert.ok(pool.includes(p.evidence), `${r.name} 禁忌 ${p.name} 的证据不在正文里`);
  }
});

test('7. 对象合法', () => {
  const names = new Set(drugs().drugs.map((x) => x.name));
  for (const r of doc().rows) {
    for (const p of r.partners) {
      assert.ok(names.has(p.name), `${r.name} 的对象 ${p.name} 不在 287 味里`);
      assert.notStrictEqual(p.name, r.name, `${r.name} 配了自己`);
    }
    assert.strictEqual(new Set(r.partners.map((p) => p.name)).size, r.partners.length, `${r.name} 对象重复`);
  }
});

test('8. md 同源', () => {
  const t = md();
  const rows = t.split('\n').filter((l) => /^\| .+ \| 教材·第\d+章·\d+\.\d+\.\d+ \| \d+ \|/.test(l));
  assert.strictEqual(rows.length, 287, 'md 明细应为 287 行');
  for (const k of ['279 / 287', '1,162', '4.049', '白术 | 35', '0 处', '芒硝']) {
    assert.ok(t.includes(k), `md 缺：${k}`);
  }
  assert.ok(!t.includes('undefined') && !t.includes('NaN'), 'md 里有 undefined/NaN');
});

'use strict';
/**
 * 五道闸校验器门（8 项）
 *   1. 287 味 × 5 闸；平均 3.341/5；完整度 66.8%；五闸全过 0；零过 0
 *   2. 逐闸通过率：产地 0 · 炮制 105 · 配伍 285 · 禁忌 285 · 剂量 284
 *   3. 行结构自洽：passed = 通过的闸数；missing = 未通过的闸名
 *   4. 证据可回查：通过闸的证据片段必须出现在该药对应字段里
 *   5. 产地全库 0 是**真的**：复算来源段「产」字命中数 = 0（防校验器坏了被当成结论）
 *   6. 未通过名单固定（改了就要重新确认）
 *   7. md 同源：287 行明细 + 四条边界 + 逐闸通过率表
 *   8. 输入指纹：drugs/底本 sha256 与留档一致
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'standards', 'zhongyao');
const DOC = path.join(DIR, 'gates.json');
const MD = path.join(DIR, 'gates.md');
const DRUGS = path.join(DIR, 'drugs.json');
const BASE = path.join(DIR, '底本.json');

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const doc = () => JSON.parse(fs.readFileSync(DOC, 'utf8'));
const drugs = () => JSON.parse(fs.readFileSync(DRUGS, 'utf8'));
const byName = () => new Map(drugs().drugs.map((d) => [d.name, d]));

test('1. 全库数字', () => {
  const s = doc().stat;
  assert.strictEqual(s.drugs, 287);
  assert.strictEqual(s.gates, 5);
  assert.strictEqual(s.meanPassed, 3.341);
  assert.strictEqual(s.meanScore, 0.668);
  assert.strictEqual(s.full, 0);
  assert.strictEqual(s.zero, 0);
  const sum = Object.values(s.dist).reduce((a, b) => a + b, 0);
  assert.strictEqual(sum, 287, '分布之和应为 287');
});

test('2. 逐闸通过率', () => {
  const g = doc().stat.byGate;
  assert.strictEqual(g.G1.pass, 0);
  assert.strictEqual(g.G2.pass, 105);
  assert.strictEqual(g.G3.pass, 285);
  assert.strictEqual(g.G4.pass, 285);
  assert.strictEqual(g.G5.pass, 284);
});

test('3. 行结构自洽', () => {
  for (const r of doc().rows) {
    assert.strictEqual(r.gates.length, 5, `${r.name} 闸数不对`);
    assert.strictEqual(r.passed, r.gates.filter((x) => x.pass).length, `${r.name} passed 与 gates 不一致`);
    assert.deepStrictEqual(r.missing, r.gates.filter((x) => !x.pass).map((x) => x.name), `${r.name} missing 不一致`);
    assert.ok(/^教材·第\d+章·\d+\.\d+\.\d+$/.test(r.locator), `${r.name} locator 格式不对：${r.locator}`);
  }
});

test('4. 证据可回查', () => {
  const M = byName();
  for (const r of doc().rows) {
    const d = M.get(r.name);
    assert.ok(d, `${r.name} 不在 drugs.json`);
    for (const g of r.gates.filter((x) => x.pass)) {
      const text = String(d.fields[g.field] || '');
      assert.ok(text.includes(g.evidence), `${r.name} 的 ${g.id} 证据「${g.evidence}」不在 ${g.field} 里`);
    }
  }
});

test('5. 产地全库 0 是真的（复算）', () => {
  const withChan = drugs().drugs.filter((d) => String(d.fields['来源与性味归经'] || '').includes('产'));
  assert.deepStrictEqual(withChan.map((d) => d.name), [], '有药的来源段含「产」，说明 G1=0 的判断失效，需重跑');
  const g1 = doc().rows.every((r) => r.gates[0].id === 'G1' && !r.gates[0].pass);
  assert.ok(g1, '每行的第一闸都应是 G1 且未通过');
});

test('6. 未通过名单固定', () => {
  const miss = (id) => doc().rows.filter((r) => !r.gates.find((g) => g.id === id).pass).map((r) => r.name).sort();
  assert.deepStrictEqual(miss('G3'), ['瓜蒂', '雷公藤'].sort());
  assert.deepStrictEqual(miss('G4'), ['蒲公英', '血余炭'].sort());
  assert.deepStrictEqual(miss('G5'), ['升药', '土荆皮', '炉甘石'].sort());
});

test('7. md 同源', () => {
  const t = fs.readFileSync(MD, 'utf8');
  const rows = t.split('\n').filter((l) => /^\| .+ \| 教材·第\d+章·\d+\.\d+\.\d+ \|/.test(l));
  assert.strictEqual(rows.length, 287, 'md 明细应为 287 行');
  assert.ok(t.includes('66.8%'), 'md 缺完整度');
  assert.ok(t.includes('3.341'), 'md 缺平均通过闸数');
  assert.ok(!t.includes('undefined') && !t.includes('NaN'), 'md 里有 undefined/NaN，说明模板取错了字段');
  for (const k of ['词面检索', '未命中只说明教材没写', '精度低', '毒性本身不等于禁忌']) {
    assert.ok(t.includes(k), `md 缺边界：${k}`);
  }
});

test('8. 输入指纹', () => {
  const d = doc();
  assert.strictEqual(d.inputs.drugs.sha256, sha(DRUGS), 'drugs.json 变了，需重跑 node scripts/check_herb_gates.js');
  assert.strictEqual(d.inputs.base.sha256, sha(BASE));
});

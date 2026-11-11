'use strict';
/**
 * 近名判定表门（8 项）
 *   1. 恰 7 条，且与 coverage.json 里 tier=near 的 7 条一一对应（病/证/BZU 码三键对齐）
 *   2. 判定只许三值，分布 2 / 2 / 3（词面近似 / 病位不同 / 病性不同）
 *   3. 判定与自述差异自洽：word-only 两侧都不差；position 只差病位；nature 只差病性
 *   4. 每条两侧都写了病位与病性（textbookSide / tm1Side）
 *   5. TM1 最近单元必须真存在，且中文名与 zh-names 一致
 *   6. alsoConsidered 里的码也必须存在（不许编码）
 *   7. why 与 consequence 都非空（判定要能追到理由与后果）
 *   8. summary 与 entries 计数一致，pending=0；coverage.md 里 7 条都显示判定而不显示「待人工」
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const NJ = path.join(ROOT, 'standards', 'zhenduan', 'near-judgements.json');
const COV = path.join(ROOT, 'standards', 'zhenduan', 'coverage.json');
const MD = path.join(ROOT, 'standards', 'zhenduan', 'coverage.md');
const ZH = path.join(ROOT, 'standards', 'icd11', 'zh-names.json');

const nj = () => JSON.parse(fs.readFileSync(NJ, 'utf8'));
const cov = () => JSON.parse(fs.readFileSync(COV, 'utf8'));
const tm1 = () => new Map(JSON.parse(fs.readFileSync(ZH, 'utf8')).names
  .filter((n) => n.module === 'TM1')
  .map((n) => [n.code, n]));

const VALID = ['word-only', 'position', 'nature'];

test('1. 7 条与 coverage 的近名档一一对应', () => {
  const e = nj().entries;
  assert.strictEqual(e.length, 7);
  const near = cov().rows.filter((r) => r.patternMatch.tier === 'near');
  assert.strictEqual(near.length, 7);
  const key = (x) => `${x.bing}|${x.zheng}`;
  assert.deepStrictEqual(e.map(key).sort(), near.map(key).sort(), '判定表与近名档不是同一批');
  for (const x of e) {
    const row = near.find((r) => key(r) === key(x));
    assert.strictEqual(x.bzuCode, row.bzuCode, `${x.bing}：BZU 码不一致`);
    assert.ok(/^BZ-B\d+-Z\d+$/.test(x.bzuCode), `${x.bing}：BZU 码格式不对`);
  }
});

test('2. 判定只许三值，分布 2/2/3', () => {
  const e = nj().entries;
  for (const x of e) assert.ok(VALID.includes(x.judgement), `${x.id} 判定非法：${x.judgement}`);
  const t = { 'word-only': 0, position: 0, nature: 0 };
  for (const x of e) t[x.judgement] += 1;
  assert.deepStrictEqual(t, { 'word-only': 2, position: 2, nature: 3 });
});

test('3. 判定与自述差异自洽', () => {
  for (const x of nj().entries) {
    assert.strictEqual(typeof x.positionDiff, 'boolean', `${x.id} 缺 positionDiff`);
    assert.strictEqual(typeof x.natureDiff, 'boolean', `${x.id} 缺 natureDiff`);
    if (x.judgement === 'word-only') {
      assert.strictEqual(x.positionDiff, false, `${x.id}：词面近似却说病位不同`);
      assert.strictEqual(x.natureDiff, false, `${x.id}：词面近似却说病性不同`);
    } else if (x.judgement === 'position') {
      assert.strictEqual(x.positionDiff, true, `${x.id}：判病位不同但 positionDiff=false`);
      assert.strictEqual(x.natureDiff, false, `${x.id}：判病位不同却又说病性不同`);
    } else {
      assert.strictEqual(x.positionDiff, false, `${x.id}：判病性不同却又说病位不同`);
      assert.strictEqual(x.natureDiff, true, `${x.id}：判病性不同但 natureDiff=false`);
    }
  }
});

test('4. 两侧都写了病位与病性', () => {
  for (const x of nj().entries) {
    for (const side of ['textbookSide', 'tm1Side']) {
      assert.ok(x[side] && x[side].position && x[side].position.length >= 1, `${x.id} 缺 ${side}.position`);
      assert.ok(x[side].nature && x[side].nature.length >= 1, `${x.id} 缺 ${side}.nature`);
    }
  }
});

test('5. TM1 最近单元真存在且名字一致', () => {
  const M = tm1();
  for (const x of nj().entries) {
    const ent = M.get(x.tm1Nearest.code);
    assert.ok(ent, `${x.id}：${x.tm1Nearest.code} 不在 TM1`);
    assert.strictEqual(ent.zh, x.tm1Nearest.zh, `${x.id}：${x.tm1Nearest.code} 中文名不一致`);
    assert.ok(/pattern/i.test(ent.en || ''), `${x.id}：${x.tm1Nearest.code} 不是证候单元（题名不含 pattern）`);
  }
});

test('6. alsoConsidered 里的码都真存在', () => {
  const M = tm1();
  for (const x of nj().entries) {
    for (const c of x.alsoConsidered || []) {
      const ent = M.get(c.code);
      assert.ok(ent, `${x.id}：备选码 ${c.code} 不在 TM1`);
      if (c.zh) assert.strictEqual(ent.zh, c.zh, `${x.id}：备选码 ${c.code} 名字不一致`);
      assert.notStrictEqual(c.code, x.tm1Nearest.code, `${x.id}：备选码与最近单元重复`);
    }
  }
});

test('7. why 与 consequence 非空', () => {
  for (const x of nj().entries) {
    assert.ok(x.why && x.why.length >= 30, `${x.id} 的 why 太短`);
    assert.ok(x.consequence && x.consequence.length >= 15, `${x.id} 缺 consequence`);
    assert.ok(/病位|病性|命名|脏腑|单元/.test(x.why), `${x.id} 的 why 没说清差异维度`);
  }
});

test('8. summary 一致、pending=0、md 已显示判定', () => {
  const d = nj();
  assert.strictEqual(d.summary.total, d.entries.length);
  assert.strictEqual(d.summary.pending, 0);
  assert.deepStrictEqual(d.summary.byJudgement, {
    'word-only': 2, position: 2, nature: 3,
  });
  const c = cov();
  assert.strictEqual(c.stat.nearJudged, 7);
  assert.strictEqual(c.stat.nearPending, 0);
  for (const r of c.rows.filter((x) => x.patternMatch.tier === 'near')) {
    assert.ok(r.judgement && r.judgement.id, `${r.bing} 未挂判定`);
  }
  const md = fs.readFileSync(MD, 'utf8');
  // 结论表里的「已人工判定 / 待人工」是表头用语，这里禁的是**逐行**还留着「待人工」
  assert.ok(!/\| 待人工 \|/.test(md), 'md 里仍有逐行「待人工」');
  assert.strictEqual((md.match(/（NJ-0\d）/g) || []).length, 7, 'md 应显示 7 条判定编号');
  for (const v of ['仅词面相近', '病位不同', '病性不同']) {
    assert.ok(md.includes(v), `md 缺判定词：${v}`);
  }
});

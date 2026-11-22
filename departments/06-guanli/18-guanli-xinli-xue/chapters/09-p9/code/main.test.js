'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { DOC, CHAPTER, TITLE, read, sections, capacity, cohesionMatrix, loafing, concepts, GROUPTHINK, COUNTERS } = require('./main.js');

const TEXT = read();

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '09-p9', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 9);
  assert.strictEqual(TITLE, '团队不是人凑齐就有战斗力，群体先生产出来的是一套规范');
  assert.strictEqual(sections(TEXT).length, 6);
});

test('群体思维六症状与四条对冲逐条命中', () => {
  const c = concepts(TEXT);
  assert.deepStrictEqual(c.groupthink, GROUPTHINK);
  assert.deepStrictEqual(c.counters, COUNTERS);
  assert.strictEqual(c.hasAsch, true);
  assert.strictEqual(c.hasSherif, true);
  assert.strictEqual(c.hasLoafing, true);
});

test('加 14% 人手只换来 6.67% 台次，人均反而下降', () => {
  const cap = capacity({ headcount: 14, cases: 6 }, { headcount: 16, cases: 6.4 });
  assert.strictEqual(cap.caseGrowth, 6.67);
  assert.strictEqual(cap.headGrowth, 14.29);
  assert.strictEqual(cap.per, 0.4286);
  assert.strictEqual(cap.perAfter, 0.4);
  assert.strictEqual(cap.perChange, -6.67);
  assert.match(cap.verdict, /规范在限产/);
});

test('凝聚力只放大方向：高凝聚 + 抵制 = 最难拆的一格', () => {
  const bad = cohesionMatrix(0.8, -1);
  assert.strictEqual(bad.quad, '高凝聚·抵制');
  assert.strictEqual(bad.effect, -0.8);
  assert.match(bad.note, /产出极差/);
  assert.strictEqual(cohesionMatrix(0.8, 1).effect, 0.8);
  assert.strictEqual(cohesionMatrix(0.2, 1).quad, '低凝聚·支持');
  assert.strictEqual(cohesionMatrix(0.2, -1).effect, -0.2);
});

test('社会懈怠：六人组约七成，三人组更高，可识别时被抵消', () => {
  assert.strictEqual(loafing(6).individual, 0.7);
  assert.ok(loafing(3).individual > loafing(6).individual);
  assert.ok(loafing(6, true).individual > loafing(6).individual);
  assert.ok(loafing(20).individual >= 0.5, '衰减有下限');
});

test('正文的判断句可在原句核对', () => {
  for (const k of ['凝聚力放大规范，不选择规范', '个人贡献不可识别', '改规范比换人难，也比换人有效', '社会助长']) {
    assert.ok(TEXT.includes(k), k);
  }
});

test('脚本可运行，输出人均变化与边界声明', () => {
  const r = require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /人均 0\.4286 → 0\.4（-6\.67%）/);
  assert.match(out, /高凝聚·抵制/);
  assert.match(out, /价值在机制不在参数/);
});

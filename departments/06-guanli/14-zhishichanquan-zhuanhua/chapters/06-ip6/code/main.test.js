'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const { parseDefenseTable, literalInfringes, equivalentAvailable, assess, DEFENSES, DOC } = require('./main.js');

const DOC_TEXT = fs.readFileSync(DOC, 'utf8');
const ROWS = parseDefenseTable(DOC_TEXT);
const CLAIM = ['A', 'B', 'C'];

test('抗辩表读出六类，顺序与正文一致', () => {
  assert.deepStrictEqual(ROWS.map((r) => r.defense), DEFENSES);
});

test('每类抗辩都有核心主张与门槛', () => {
  for (const r of ROWS) {
    assert.ok(r.claim.length >= 4, r.defense + ' 缺核心主张');
    assert.ok(r.threshold.length >= 4, r.defense + ' 缺门槛');
  }
});

test('全面覆盖：特征齐全即落入，多出的特征不影响', () => {
  assert.strictEqual(literalInfringes(CLAIM, ['A', 'B', 'C']), true);
  assert.strictEqual(literalInfringes(CLAIM, ['A', 'B', 'C', 'D']), true);
  assert.strictEqual(literalInfringes(CLAIM, ['A', 'B']), false);
  assert.strictEqual(literalInfringes(CLAIM, ['A', 'C', 'D']), false);
});

test('等同受三条限制，任一触发即不成立', () => {
  assert.deepStrictEqual(equivalentAvailable({}), { ok: true, reason: '手段、功能、效果实质相同且无需创造性劳动' });
  assert.deepStrictEqual(equivalentAvailable({ estoppel: true }), { ok: false, reason: '禁止反悔' });
  assert.deepStrictEqual(equivalentAvailable({ dedicatedToPublic: true }), { ok: false, reason: '捐献规则' });
  assert.deepStrictEqual(equivalentAvailable({ readsOnPriorArt: true }), { ok: false, reason: '现有技术抗辩的挤压' });
});

test('两步判定：字面优先，替换特征时才看等同', () => {
  assert.deepStrictEqual(assess(CLAIM, ['A', 'B', 'C']), { infringes: true, basis: '字面全面覆盖' });
  const eq = assess(CLAIM, ['A', 'B', 'D'], { equivalents: { C: 'D' } });
  assert.strictEqual(eq.infringes, true);
  assert.match(eq.basis, /^等同：/);
  const est = assess(CLAIM, ['A', 'B', 'D'], { equivalents: { C: 'D' }, estoppel: true });
  assert.strictEqual(est.infringes, false);
  assert.match(est.basis, /禁止反悔/);
});

test('缺必要技术特征直接不落入，轮不到等同', () => {
  const r = assess(CLAIM, ['A', 'B'], {});
  assert.deepStrictEqual(r, { infringes: false, basis: '不落入（缺少必要技术特征）' });
  const r2 = assess(CLAIM, ['A', 'B'], { estoppel: false, dedicatedToPublic: false, readsOnPriorArt: false });
  assert.strictEqual(r2.infringes, false);
  assert.match(r2.basis, /缺少必要技术特征/);
});

test('正文保留全面覆盖与三条限制的说法', () => {
  assert.ok(DOC_TEXT.includes('必须包含权利要求中记载的'));
  assert.ok(DOC_TEXT.includes('捐献规则'));
  assert.ok(DOC_TEXT.includes('不能仲裁'));
});

test('脚本可运行并打印判定与抗辩清单', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /抗辩清单（6 类）/);
  assert.match(out, /审查中已放弃 → 不落入（禁止反悔）/);
});

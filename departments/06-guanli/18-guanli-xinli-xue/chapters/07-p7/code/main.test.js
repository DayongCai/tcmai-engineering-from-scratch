'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { DOC, CHAPTER, TITLE, read, sections, burnout, mode, jdr, compareLevers, restraint, concepts, MODES, GROSS } = require('./main.js');

const TEXT = read();

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '07-p7', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 7);
  assert.strictEqual(TITLE, '要求员工「态度好」，是把一项成本从患者转给了员工');
  assert.strictEqual(sections(TEXT).length, 6);
});

test('倦怠三维与两种扮演都命中正文', () => {
  const c = concepts(TEXT);
  assert.deepStrictEqual(c.signs, ['情绪耗竭', '去人格化', '低个人成就感']);
  assert.strictEqual(c.hasSurface, true);
  assert.strictEqual(c.hasDeep, true);
  assert.strictEqual(c.hasJDR, true);
  assert.strictEqual(c.hasGross, true);
});

test('两本账：耗竭 2.4→3.3 增 0.9、达量表 55%', () => {
  const e1 = burnout(2.4, 3.3);
  assert.strictEqual(e1.delta, 0.9);
  assert.strictEqual(e1.growth, 37.5);
  assert.strictEqual(e1.shareOfScale, 55);
  const e2 = burnout(1.7, 2.6);
  assert.strictEqual(e2.delta, 0.9);
  assert.strictEqual(e2.growth, 52.9);
  assert.ok(e2.growth > e1.growth, '去人格化的相对增幅更大');
});

test('三种情绪劳动方式的判定与代价权重', () => {
  assert.strictEqual(mode(true, false).mode, '真实表达');
  assert.strictEqual(mode(false, true).mode, '深层扮演');
  assert.strictEqual(mode(false, false).mode, '表层扮演');
  assert.ok(MODES.表层扮演.cost > MODES.深层扮演.cost);
  assert.strictEqual(MODES.真实表达.cost, 0);
});

test('减要求与加资源不等价：同样降耗竭，产出差 1', () => {
  const cmp = compareLevers(4, 2);
  assert.deepStrictEqual(cmp.base, { demands: 4, resources: 2, strain: 2, output: 4 });
  assert.strictEqual(cmp.cutDemand.output, 3);
  assert.strictEqual(cmp.addResource.output, 4);
  assert.strictEqual(cmp.cutDemand.strain, cmp.addResource.strain);
  assert.strictEqual(cmp.outputCostOfCutting, 1);
});

test('资源超过要求后耗竭归零，不再为负', () => {
  assert.strictEqual(jdr(2, 5).strain, 0);
  assert.strictEqual(jdr(2, 5).output, 2);
});

test('格罗斯五环成本单调递增，反应调整在最末', () => {
  for (let i = 1; i < GROSS.length; i += 1) assert.ok(GROSS[i].cost > GROSS[i - 1].cost);
  assert.strictEqual(GROSS[GROSS.length - 1].stage, '反应调整');
  assert.strictEqual(GROSS[3].stage, '认知改变');
});

test('五行情志相胜从正文解析出 5 条配对', () => {
  const pairs = restraint(TEXT);
  assert.strictEqual(pairs.length, 5);
  assert.deepStrictEqual(pairs.map((p) => `${p.by}胜${p.over}`), ['悲胜怒', '恐胜喜', '怒胜思', '喜胜忧', '思胜恐']);
});

test('脚本可运行，输出两本账与边界声明', () => {
  const r = require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /情绪耗竭 2\.4 → 3\.3：\+0\.9/);
  assert.match(out, /产出少 1/);
  assert.match(out, /识别、支持与转介/);
});

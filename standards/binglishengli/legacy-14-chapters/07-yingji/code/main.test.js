#!/usr/bin/env node
/**
 * 第 7 章 应激 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、节分布、两面的环节覆盖、层次落点、个体差异三类来源、边界句式、数值是否为 0。
 * 不锁死正文措辞——底本改写段落时，测试不该变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  FACES,
  LAYERS,
  DIFF,
  BOUNDARY,
  loadBase,
  loadUnits,
  chapterUnits,
  shape,
  unitMeta,
  lens,
  rank,
  total,
  valueAudit,
  faceCoverage,
  layerCoverage,
  diffCoverage,
  boundaryCount,
  bySection,
} = require('./main');

const base = loadBase();
const list = chapterUnits(base);
const meta = unitMeta(loadUnits())(list);

test('本章 6 个知识单元，分属 2 节，正文合计 10735 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 6);
  assert.strictEqual(s.secs, 2);
  assert.strictEqual(s.chars, 10735);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '7.3.1', '7.3.2', '7.3.3',
    '7.4.1', '7.4.2', '7.4.3',
  ]);
});

test('单元标题与小节号逐一对上底本，不经手抄', () => {
  assert.deepStrictEqual(list.map((u) => u.title), [
    '神经内分泌反应类别',
    '细胞应激反应类别',
    '应激与功能变化的关系',
    '应激与功能紊乱的关系类别',
    '个体差异的类别表述',
    '由具备资质的人员判定的边界',
  ]);
  // 章号取小节号本身：本章 6 个单元全部来自底本第 7 章
  for (const u of list) assert.strictEqual(u.sub.split('.')[0], '7');
});

test('数值核验：6 个单元的 valueLike 全为 0，没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(meta);
  assert.strictEqual(audit.units, 6);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of meta) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('三视角以「机能」居首、「病因」为零：底本写的是功能怎么被调', () => {
  const { views } = lens(meta);
  assert.strictEqual(total(views), 210);
  assert.strictEqual(views.机能, 131);
  assert.strictEqual(views.机制, 79);
  assert.strictEqual(views.病因, 0);
  assert.strictEqual(rank(views)[0][0], '机能');
});

test('四层级落在细胞层：细胞自保那一段不是附属', () => {
  const { levels } = lens(meta);
  assert.strictEqual(total(levels), 73);
  assert.strictEqual(levels.细胞, 41);
  assert.strictEqual(levels.系统, 28);
  assert.strictEqual(levels.器官, 4);
  assert.strictEqual(levels.组织, 0);
  assert.strictEqual(rank(levels)[0][0], '细胞');
});

test('两面齐全：神经内分泌四项全部落在 7.3.1，细胞六项全部落在 7.3.2', () => {
  assert.strictEqual(FACES.length, 10);
  const cov = faceCoverage(list);
  const neuro = cov.filter((f) => f.face === '神经内分泌');
  const cell = cov.filter((f) => f.face === '细胞');
  assert.strictEqual(neuro.length, 4);
  assert.strictEqual(cell.length, 6);
  for (const f of cov) assert.deepStrictEqual(f.units, [f.face === '神经内分泌' ? '7.3.1' : '7.3.2'], `${f.label} 落点`);
});

test('层次四问齐全：功能调整 → 结构痕迹都在 7.3.3，功能紊乱的界线在 7.4.1', () => {
  assert.deepStrictEqual(LAYERS.map((l) => l.key), ['功能层面的调整', '结构层面留下痕迹', '难以自行回转', '双向关系']);
  const cov = Object.fromEntries(layerCoverage(list).map((l) => [l.key, l.units]));
  assert.deepStrictEqual(cov['功能层面的调整'], ['7.3.3']);
  assert.deepStrictEqual(cov['结构层面留下痕迹'], ['7.3.3']);
  assert.deepStrictEqual(cov['难以自行回转'], ['7.4.1']);
  assert.deepStrictEqual(cov['双向关系'], ['7.3.3']);
});

test('个体差异三类来源都在 7.4.2；调节储备同时被 7.3.3 提到（两层共用一条依据）', () => {
  assert.deepStrictEqual(DIFF.map((d) => d.key), ['调节储备', '基础状态与伴随情况', '刺激本身的类别特征']);
  const cov = Object.fromEntries(diffCoverage(list).map((d) => [d.key, d.units]));
  assert.deepStrictEqual(cov['调节储备'], ['7.3.3', '7.4.2']);
  assert.deepStrictEqual(cov['基础状态与伴随情况'], ['7.4.2']);
  assert.deepStrictEqual(cov['刺激本身的类别特征'], ['7.4.2']);
});

test('边界句式贯穿全章，且收在 7.4.3', () => {
  assert.deepStrictEqual(BOUNDARY, ['不作疾病诊断', '不具备判定的功能', '具备资质的人员', '不得混称', '敏感个人信息']);
  assert.ok(boundaryCount(list) >= 10, `边界句式只命中 ${boundaryCount(list)} 处`);
  const last = list[list.length - 1];
  assert.strictEqual(last.sub, '7.4.3');
  for (const p of BOUNDARY.filter((x) => x !== '不具备判定的功能')) assert.ok(last.raw.includes(p), `7.4.3 缺「${p}」`);
});

test('两节收支均衡：各 3 单元，每节都在 5000 字以上（没有薄节）', () => {
  const secs = bySection(list);
  assert.strictEqual(secs.size, 2);
  assert.deepStrictEqual([...secs.keys()].sort(), ['7.3', '7.4']);
  for (const [sec, g] of secs) {
    assert.strictEqual(g.units, 3, `${sec} 单元数`);
    assert.ok(g.chars > 5000, `${sec} 只有 ${g.chars} 字`);
  }
});

test('每单元 brief 都带「不作诊断与判定」的口径句（底本自己的声明）', () => {
  const bySub = new Map(loadUnits().units.map((u) => [u.sub, u]));
  for (const u of list) assert.match(bySub.get(u.sub).brief, /不作诊断与判定/, `${u.sub} brief 缺口径`);
});

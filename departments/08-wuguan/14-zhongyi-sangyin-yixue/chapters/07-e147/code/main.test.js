'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const {
  DOC,
  CHAPTER,
  SLUG,
  readDoc,
  lesions,
  syndromes,
  voiceRules,
  occupations,
  classifyLesion,
  whitePatchOrder,
  gaps,
} = require('./main.js');

const doc = readDoc();

test('正文可读且规模合理', () => {
  assert.ok(fs.existsSync(DOC));
  assert.ok(doc.length > 2000, '正文过短');
});

test('四种病变各写清侧别、形态、声音特征与诱因', () => {
  const l = lesions(doc);
  assert.strictEqual(l.length, 4);
  assert.deepStrictEqual(l.map((x) => x.lesion), ['声带小结', '声带息肉', '任克水肿', '喉白斑']);
  for (const x of l) {
    assert.ok(x.side.length >= 2, `${x.lesion} 缺侧别`);
    assert.ok(x.voice.length >= 4, `${x.lesion} 缺声音特征`);
    assert.ok(x.cause.length >= 4, `${x.lesion} 缺诱因`);
  }
});

test('小结长在双侧对称的前中三分之一，息肉多单侧', () => {
  const l = lesions(doc);
  assert.match(l[0].side, /双侧对称/);
  assert.match(l[0].side, /前中三分之一/);
  assert.match(l[1].side, /单侧/);
});

test('一组声带所见能落回病变，且四种判据互不串位', () => {
  assert.strictEqual(classifyLesion({ symmetric: true, frontMiddle: true }).lesion, '声带小结');
  assert.strictEqual(classifyLesion({ unilateral: true }).lesion, '声带息肉');
  assert.strictEqual(classifyLesion({ wholeLength: true }).lesion, '任克水肿');
  assert.strictEqual(classifyLesion({ whitePatch: true }).lesion, '喉白斑');
  assert.strictEqual(classifyLesion({}), null);
  // 单侧优先于对称，白斑优先于一切：白斑是潜在恶性，不能按增生处理
  assert.strictEqual(classifyLesion({ whitePatch: true, unilateral: true }).lesion, '喉白斑');
});

test('白斑的处置顺序是活检→分级→随访，不许倒置', () => {
  const w = whitePatchOrder(doc);
  assert.strictEqual(w.order, '先活检、再分级、后随访');
  assert.strictEqual(w.isPremalignant, true);
  assert.strictEqual(classifyLesion({ whitePatch: true }).action, w.order);
});

test('对读六型齐全，声带所见一列明写为对读', () => {
  const s = syndromes(doc);
  assert.strictEqual(s.length, 6);
  assert.deepStrictEqual(s.map((x) => x.type), ['风寒袭肺', '风热犯肺／痰热壅肺', '痰湿凝结', '气滞血瘀', '肺肾阴虚', '肺脾气虚']);
  assert.match(doc, /声带所见」一列是对读，不是等号/);
});

test('三个不等号都在，证名不替代检查', () => {
  const g = gaps(doc);
  assert.strictEqual(g.length, 3);
  assert.deepStrictEqual(g.map((x) => `${x.left}≠${x.right}`), ['气滞血瘀≠纤维化', '痰湿凝结≠积液', '肺脾气虚≠肌张力低']);
});

test('四条用嗓规则每条都带「做到什么算对」的判据', () => {
  const r = voiceRules(doc);
  assert.strictEqual(r.length, 4);
  assert.deepStrictEqual(r.map((x) => x.dimension), ['音高', '时长', '湿度', '休声']);
  for (const x of r) {
    assert.ok(x.criterion.length >= 6, `${x.dimension} 缺判据`);
    assert.ok(x.mistake.length >= 4, `${x.dimension} 缺常见错误`);
  }
});

test('休声分三级，耳语不算休息', () => {
  const r = voiceRules(doc).find((x) => x.dimension === '休声');
  assert.match(r.rule, /绝对休声/);
  assert.match(r.rule, /相对休声/);
  assert.match(doc, /把耳语当休息/);
});

test('职业用嗓分三层，一层是制度性保护，三层靠一次转诊', () => {
  const o = occupations(doc);
  assert.strictEqual(o.length, 3);
  assert.match(o[0].tier, /高强度/);
  assert.match(o[1].tier, /中等强度/);
  assert.match(o[2].tier, /高危个体/);
  for (const x of o) assert.ok(x.advice.length >= 6, `${x.tier} 缺建议`);
});

test('脚本可运行，输出含现算声明与临床边界', () => {
  const r = spawnSync(process.execPath, [require.resolve('./main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 200);
  assert.match(out, /现算/);
  assert.match(out, /不构成/);
  assert.match(out, new RegExp(SLUG));
  assert.match(out, new RegExp(`第 ${CHAPTER} 章`));
});

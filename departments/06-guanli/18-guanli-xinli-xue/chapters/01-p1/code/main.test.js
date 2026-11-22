'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  DOC, CHAPTER, TITLE, read, sections, tables, fiveRings, layers, classifyFix, ratingProfile, guard,
} = require('./main.js');

const TEXT = read();
const A = sections(TEXT);

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '01-p1', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 1);
  assert.strictEqual(TITLE, '管理心理学测的不是人心，是判断的误差');
  assert.ok(TEXT.startsWith('# 第 1 章'));
});

test('正文六节，节名可复算（不是硬编码清单）', () => {
  assert.strictEqual(A.length, 6);
  assert.strictEqual(A[0], '一、研究对象是三层，不是「人心」');
  assert.strictEqual(A[5], '六、代价与边界');
});

test('五环表从正文表格解析出 5 行，顺序为人性假设→健康', () => {
  const rings = fiveRings(TEXT);
  assert.strictEqual(rings.length, 5);
  assert.deepStrictEqual(rings.map((r) => r.ring), ['人性假设', '个体', '群体', '领导', '健康']);
  assert.match(rings[0].question, /我把人预设成什么/);
  assert.match(rings[4].cost, /耗竭/);
  assert.strictEqual(tables(TEXT).length, 1);
});

test('三层的研究范围逐字出自正文', () => {
  const ls = layers(TEXT);
  assert.strictEqual(ls.length, 3);
  assert.strictEqual(ls[0].scope, '知觉、归因、人格、态度、情绪、动机');
  assert.strictEqual(ls[1].scope, '规范、从众、凝聚力、沟通、冲突');
  assert.strictEqual(ls[2].scope, '文化、承诺、领导、工作设计与变革');
  for (const l of ls) assert.ok(TEXT.includes(l.scope), l.scope);
});

test('「改什么」映射三层：培训→个体、规范→群体、口径→组织', () => {
  assert.strictEqual(classifyFix('给全科做沟通技巧培训'), '个体层');
  assert.strictEqual(classifyFix('重写交接与协作规范'), '群体层');
  assert.strictEqual(classifyFix('把台次从绩效口径里拆出来'), '组织层');
  assert.match(classifyFix('请大家提高认识'), /无法定位/);
});

test('三组评价的均值与极差现算：4.6／3.9／3.1', () => {
  const p = ratingProfile({ 科主任: 4.6, 同事均值: 3.9, 实习生: 3.1 });
  assert.strictEqual(p.mean, 3.8667);
  assert.strictEqual(p.spread, 1.5);
  assert.strictEqual(p.hi, '科主任');
  assert.strictEqual(p.lo, '实习生');
  assert.match(p.verdict, /视角差异大于误差/);
  // 同一个人被三组人看，极差已接近均值的四成
  assert.ok(p.spreadRatio > 0.35 && p.spreadRatio < 0.4);
});

test('三条方法底线在正文里可查', () => {
  for (const k of ['相关不等于因果', '信度是效度的必要条件', '敏感个人信息']) {
    assert.ok(TEXT.includes(k), k);
  }
});

test('不可证伪的说法被三个反问拦下', () => {
  const bad = guard('他嘴上同意，心里还是抵触');
  assert.strictEqual(bad.falsifiable, false);
  assert.strictEqual(bad.verdict, '不是知识，是态度');
  const ok = guard('下午四点只开一个取药窗口，患者排队到门外');
  assert.strictEqual(ok.falsifiable, true);
});

test('脚本可运行，输出带现算口径与边界声明', () => {
  const r = require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成心理诊断/);
  assert.match(out, /极差 1\.5/);
});

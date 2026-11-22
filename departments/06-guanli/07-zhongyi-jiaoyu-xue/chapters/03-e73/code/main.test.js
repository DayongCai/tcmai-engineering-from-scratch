'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  DOC, CHAPTER, TITLE, read, cnToNum, sections, tables, tableBy, col,
  facts, hourRatio, groupSizes, groupsFor, summary,
} = require('./main.js');

const TEXT = read();
const S = summary(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC));
  assert.ok(DOC.endsWith(path.join('chapters', '03-e73', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 3);
  assert.strictEqual(TITLE, '课程表是一份资源分配文件，不是一个知识清单');
  assert.ok(TEXT.startsWith('# 第 3 章'));
});

test('四块板块被压缩时，失去的都是要花时间在场的部分', () => {
  assert.deepStrictEqual(S.blocks, ['中医基础', '经典', '西医', '临床与实习']);
  assert.strictEqual(S.onSiteLosses.length, 4);
  assert.ok(S.losses.every((x) => /实验|认药|通读|见习|操作|跟诊|床边/.test(x)));
  assert.match(TEXT, /失去的都是「要花时间在场」的部分/);
});

test('经典课三种上法按名对齐学时比 3:5:2', () => {
  const r = hourRatio(TEXT);
  assert.deepStrictEqual(r.parts, [3, 5, 2]);
  assert.strictEqual(r.sum, 10);
  assert.strictEqual(r.shares['通读'], 0.3);
  assert.strictEqual(r.shares['以方证为纲'], 0.5);
  assert.strictEqual(r.shares['选读'], 0.2);
  assert.strictEqual(S.methods.length, 3);
});

test('组规模上下限从形式表里取到，且上限递增', () => {
  const sizes = groupSizes(facts(TEXT).forms);
  assert.deepStrictEqual(sizes.map((s) => [s.min, s.max]), [[80, 200], [15, 30], [6, 10], [1, 3]]);
  for (let i = 1; i < sizes.length; i += 1) assert.ok(sizes[i].max < sizes[i - 1].max);
});

test('百人班按小班上限拆成四组，与正文一致', () => {
  assert.strictEqual(S.classSize, 100);
  const g = groupsFor(S.classSize, S.sizes);
  const small = g.find((x) => x.form === '小班研讨');
  assert.strictEqual(small.groups, 4);
  assert.match(TEXT, /一个百人班要拆成四组/);
  assert.strictEqual(g.find((x) => x.form === '门诊跟诊抄方').groups, 34);
});

test('合流点三处，都在病床边；四种整合共用一种失败', () => {
  assert.deepStrictEqual(S.scenes, ['同一个发热病人', '同一个胃痛病人', '同一个失眠病人']);
  assert.deepStrictEqual(S.integrations, ['横向整合', '纵向整合', '以证为核心整合', '模块化整合']);
  assert.match(TEXT, /整合课没有主人/);
  assert.match(TEXT, /西医负责排除与兜底，中医负责个体化处置/);
});

test('章节共六节，代价与边界单列', () => {
  const titles = sections(TEXT).map((s) => s.title);
  assert.strictEqual(titles.length, 6);
  assert.ok(titles[5].includes('代价与边界'));
  assert.ok(tables(TEXT).length >= 4);
});

test('脚本可运行，输出学时零和、拆组数与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /学时比 3:5:2/);
  assert.match(out, /小班研讨：4 组/);
  assert.match(out, /100 人班/);
  assert.match(out, /不构成诊疗/);
  assert.ok(out.split('\n').every((l) => !/undefined|NaN/.test(l)), '输出里有未取到的字段');
});

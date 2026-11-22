'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  DOC, CHAPTER, TITLE, read, cnToNum, sections, tables, tableBy, col, codeBlock,
  facts, ladder, failureShape, summary,
} = require('./main.js');

const TEXT = read();
const S = summary(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC));
  assert.ok(DOC.endsWith(path.join('chapters', '06-e76', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 6);
  assert.strictEqual(TITLE, '师承给的是手感，院校给的是边界，谁也替代不了谁');
  assert.ok(TEXT.startsWith('# 第 6 章'));
});

test('两条轨六维对照，失败形态互补', () => {
  const t = tableBy(TEXT, '维度');
  assert.deepStrictEqual(t.header, ['维度', '院校轨', '师承轨']);
  assert.strictEqual(t.rows.length, 6);
  assert.deepStrictEqual(S.dims, ['规模', '时间', '病种', '知识形态', '评价', '失败形态']);
  const shape = failureShape(t);
  assert.match(shape.college, /见过没碰过/);
  assert.match(shape.master, /碰过没读透/);
  assert.strictEqual(S.complementary, true);
});

test('跟诊三级按行首粗体取到，动作依次是看、写、做', () => {
  const l = ladder(TEXT);
  assert.deepStrictEqual(l, [
    { no: 1, stage: '侍诊', act: '看' },
    { no: 2, stage: '抄方', act: '写' },
    { no: 3, stage: '接诊', act: '做' },
  ]);
});

test('抄方记录八个字段，预判一行、差异两行', () => {
  assert.strictEqual(S.fields.length, 8);
  assert.strictEqual(S.keyFields.length, 3);
  assert.strictEqual(S.keyFields.filter((x) => /预判/.test(x)).length, 1);
  assert.strictEqual(S.keyFields.filter((x) => /差异/.test(x)).length, 2);
  assert.ok(codeBlock(facts(TEXT).sec3.body).text.includes('老师的判断与依据'));
});

test('师承三种失败模式，外加一种制度性失败', () => {
  assert.deepStrictEqual(S.failures, ['只抄不读', '只读不摸', '门户之限']);
  assert.strictEqual(S.fourth, true);
  assert.match(TEXT, /都不是学得不够，是学的结构缺了一角/);
});

test('院校能补三件事，从正文第五节取到', () => {
  assert.deepStrictEqual(S.schoolJobs, ['早临床，但要带任务', '床边教学小组化', '把师承嵌进院校']);
  assert.strictEqual(S.schoolJobs.length, 3);
});

test('章节共六节，代价与边界单列', () => {
  const titles = sections(TEXT).map((s) => s.title);
  assert.strictEqual(titles.length, 6);
  assert.ok(titles[5].includes('代价与边界'));
  assert.ok(tables(TEXT).length >= 1);
});

test('脚本可运行，输出两轨对照、跟诊三级与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /两条轨 6 个维度对照/);
  assert.match(out, /跟诊 3 级：侍诊（看） → 抄方（写） → 接诊（做）/);
  assert.match(out, /师承失败 3 种 \+ 1 种制度性失败/);
  assert.match(out, /不构成诊疗/);
  assert.ok(out.split('\n').every((l) => !/undefined|NaN/.test(l)), '输出里有未取到的字段');
});

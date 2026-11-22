'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  DOC, CHAPTER, TITLE, read, sections, tables, tableBy, col,
  facts, targets, layerSplit, slide, summary,
} = require('./main.js');

const TEXT = read();
const S = summary(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC));
  assert.ok(DOC.endsWith(path.join('chapters', '07-e77', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 7);
  assert.strictEqual(TITLE, '认证保证的是底线，不是水平');
  assert.ok(TEXT.startsWith('# 第 7 章'));
});

test('三套标准五行五列：两套判专业，一套判人', () => {
  const t = tableBy(TEXT, '标准');
  assert.deepStrictEqual(t.header, ['标准', '管什么', '判定对象', '结论形态', '失效后的样子']);
  assert.strictEqual(t.rows.length, 3);
  const tg = targets(t);
  assert.deepStrictEqual(tg.map((x) => x.target), ['专业', '专业', '人']);
  assert.deepStrictEqual(S.professional, ['教学质量国家标准', '专业认证']);
  assert.deepStrictEqual(S.personal, ['执业资格考试']);
  assert.strictEqual(S.targetDistinct, 2);
});

test('标准化买到三样：可比、可迁移、可追责', () => {
  assert.deepStrictEqual(S.gains, ['可比', '可迁移', '可追责']);
  assert.match(TEXT, /可比性的价值在流通，不在优劣/);
});

test('七层可行度：可 3、必须 1、部分 2、不能 1，必须那层是安全', () => {
  const l = layerSplit(facts(TEXT).layers);
  assert.strictEqual(l.rows.length, 7);
  assert.deepStrictEqual(l.counts, { 能: 3, 必须: 1, 部分: 2, 不能: 1 });
  assert.deepStrictEqual(l.must, ['安全']);
  assert.deepStrictEqual(l.rows.filter((x) => x.level === '不能').map((x) => x.layer), ['指下判断']);
});

test('滑坡五步，第五步是教学内容等于题库覆盖范围', () => {
  const sl = slide(TEXT);
  assert.strictEqual(sl.steps.length, 5);
  assert.match(sl.last, /教学的实际内容等于题库的覆盖范围/);
  assert.ok(sl.steps[0].includes('标准规定课程与内容下限'));
});

test('认证三种用坏方式取到，正确用法是体检', () => {
  assert.deepStrictEqual(S.misuse, ['当成奖状', '当成材料工程', '当成排名']);
  assert.strictEqual(S.misuse.length, 3);
  assert.match(TEXT, /正确的用法是体检/);
});

test('章节共六节，代价与边界单列', () => {
  const titles = sections(TEXT).map((s) => s.title);
  assert.strictEqual(titles.length, 6);
  assert.ok(titles[5].includes('代价与边界'));
  assert.ok(tables(TEXT).length >= 2);
});

test('脚本可运行，输出判定对象、分层与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /管专业的有 2 套，管人的 1 套/);
  assert.match(out, /必须硬性标准化的只有 1 层：安全/);
  assert.match(out, /从大纲滑到题库 5 步/);
  assert.match(out, /不构成对任何标准条文的解释/);
  assert.ok(out.split('\n').every((l) => !/undefined|NaN/.test(l)), '输出里有未取到的字段');
});

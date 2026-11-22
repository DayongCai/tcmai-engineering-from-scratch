'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  DOC, CHAPTER, TITLE, read, cnToNum, sections, tables, tableBy, col,
  facts, owners, linkage, fakePaths, summary,
} = require('./main.js');

const TEXT = read();
const S = summary(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC));
  assert.ok(DOC.endsWith(path.join('chapters', '02-e72', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 2);
  assert.strictEqual(TITLE, '学科强不等于学生会看病：这是两本账');
  assert.ok(TEXT.startsWith('# 第 2 章'));
});

test('学科与专业的支撑关系从正文取到：各三个', () => {
  const l = linkage(TEXT);
  assert.deepStrictEqual(l.majors, ['中医学', '中西医临床医学', '针灸推拿学']);
  assert.deepStrictEqual(l.subjects, ['基础', '文献', '临床']);
  assert.strictEqual(l.majorCount, 3);
  assert.strictEqual(l.subjectCount, 3);
});

test('培养层次表是四行四列，每行都有判据与错位', () => {
  const t = tableBy(TEXT, '层次');
  assert.deepStrictEqual(t.header, ['层次', '培养什么', '判据', '常见错位']);
  assert.strictEqual(t.rows.length, 4);
  for (const r of t.rows) {
    assert.ok(r[col(t, '判据')].length > 4, '判据为空');
    assert.ok(r[col(t, '常见错位')].length > 4, '错位为空');
  }
  assert.strictEqual(S.tiers.length, 4);
});

test('层次数与责任人数相等，四段各有一个负责人', () => {
  const o = owners(facts(TEXT).sec2.body);
  assert.strictEqual(o.length, 4);
  assert.deepStrictEqual(o, ['带教医师', '轮转科室的主治', '导师', '本人和所在科室']);
  assert.strictEqual(o.length, S.tiers.length);
});

test('反哺的真路径三条、假路径三个特征', () => {
  assert.deepStrictEqual(S.truth, ['真路径一：病例库', '真路径二：团队进课堂', '真路径三：临床问题变课题，课题回到课程']);
  assert.deepStrictEqual(fakePaths(TEXT), ['只挂牌子', '只办讲座', '只换教材']);
  assert.match(TEXT, /只挂牌子（教学基地、实践基地）/);
});

test('三个可统计的量都从正文第五节取到', () => {
  assert.deepStrictEqual(S.metrics, ['学生独立接诊例数', '病历被上级修改率', '独立处方例数与被退回率']);
  assert.strictEqual(S.metrics.length, 3);
});

test('章节共六节，两本账的辨析在第一节', () => {
  const titles = sections(TEXT).map((s) => s.title);
  assert.strictEqual(titles.length, 6);
  assert.ok(titles[0].includes('学科与专业'));
  assert.ok(titles[5].includes('代价与边界'));
  assert.ok(tables(TEXT).length >= 1);
});

test('脚本可运行，输出两本账、四层次与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /一个学科支撑 3 个专业/);
  assert.match(out, /4 个培养层次/);
  assert.match(out, /反哺：真路径 3 条，假路径 3 条/);
  assert.match(out, /不构成诊疗/);
  assert.ok(out.split('\n').every((l) => !/undefined|NaN/.test(l)), '输出里有未取到的字段');
});

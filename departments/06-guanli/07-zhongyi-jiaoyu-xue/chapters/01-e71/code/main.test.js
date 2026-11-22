'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  DOC, CHAPTER, TITLE, read, cnToNum, sections, tables, tableBy, boldLeads,
  facts, needsHumanAudit, capabilityOrder, summary,
} = require('./main.js');

const TEXT = read();
const S = summary(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC));
  assert.ok(DOC.endsWith(path.join('chapters', '01-e71', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 1);
  assert.strictEqual(TITLE, '中医教育的对象不是「学生」，是五类先验不同的人');
  assert.ok(TEXT.startsWith('# 第 1 章'));
});

test('中文数字解析覆盖本章出现的写法', () => {
  assert.strictEqual(cnToNum('三'), 3);
  assert.strictEqual(cnToNum('五'), 5);
  assert.strictEqual(cnToNum('十'), 10);
  assert.strictEqual(cnToNum('二十'), 20);
});

test('三张表的形状与正文一致：对象、动作、判据各五条', () => {
  const learners = tableBy(TEXT, '对象');
  const actions = tableBy(TEXT, '动作');
  const criteria = tableBy(TEXT, '判据');
  assert.strictEqual(learners.header.length, 4);
  assert.strictEqual(learners.rows.length, 5);
  assert.strictEqual(actions.rows.length, 5);
  assert.strictEqual(criteria.rows.length, 5);
  assert.deepStrictEqual(learners.header, ['对象', '已有', '缺', '最容易被教坏的地方']);
});

test('五类人的缺口互不重复，同一份课表打不中全部', () => {
  assert.strictEqual(S.learners.length, 5);
  assert.strictEqual(S.gaps.length, 5);
  assert.strictEqual(S.gapDistinct, 5);
  assert.ok(S.learners.includes('师承人员') && S.learners.includes('西学中人员'));
});

test('五个动作的顺序就是接诊的先后', () => {
  assert.strictEqual(S.actions.join(' → '), '接得住 → 问得全 → 辨得出 → 开得下 → 说得清');
});

test('五条判据各有签字人，且签字人不重复', () => {
  assert.strictEqual(S.criteria.length, 5);
  assert.ok(S.signers.every((x) => x && x.length > 0));
  assert.strictEqual(S.signerDistinct, 5);
});

test('落在病历与跟师笔记上的判据恰是第一条与第五条', () => {
  const hit = needsHumanAudit(facts(TEXT).criteria);
  assert.deepStrictEqual(hit.map((x) => x.no), [1, 5]);
  assert.match(hit[0].name, /病历/);
  assert.match(hit[1].name, /笔记/);
  assert.match(TEXT, /第一条与第五条最难落实/);
});

test('三段能力的排法是技能 → 理法 → 边界', () => {
  const order = capabilityOrder(facts(TEXT).capability.body).map((x) => x.name);
  assert.deepStrictEqual(order, ['会做', '说得清', '守得住']);
  assert.match(TEXT, /技能可以在早期就接触/);
});

test('章节共六节，代价与边界单列一节', () => {
  const titles = sections(TEXT).map((s) => s.title);
  assert.strictEqual(titles.length, 6);
  assert.ok(titles[5].includes('代价与边界'));
  assert.strictEqual(tables(TEXT).length >= 3, true);
});

test('脚本可运行，输出五类对象、五条判据与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /5 类人/);
  assert.match(out, /毕业判据 5 条/);
  assert.match(out, /现算/);
  assert.match(out, /不构成诊疗/);
  assert.ok(out.split('\n').every((l) => !/undefined|NaN/.test(l)), '输出里有未取到的字段');
});
